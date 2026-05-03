import CommentPlan from "../models/CommentPlan.js";
import CommentProfiles from "../models/commentProfiles.js";

const PLAN_DEFINITIONS = {
  monthly: { days: 30, limit: 4, badge: "Miembro" },
  annual: { days: 365, limit: null, badge: "Hombre Top" }
};

const getUsage = async (userId, planType) => {
  if (planType === "monthly") {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const count = await CommentProfiles.countDocuments({
      authorId: userId,
      createdAt: { $gte: since }
    });
    return { used: count, limit: PLAN_DEFINITIONS.monthly.limit, window: "rolling_30_days" };
  }

  if (planType === "annual") {
    return { used: null, limit: null, window: "unlimited" };
  }

  const total = await CommentProfiles.countDocuments({ authorId: userId });
  return { used: total, limit: 1, window: "lifetime" };
};

const normalizePlanStatus = async (plan) => {
  if (!plan) return null;

  if (plan.status === "active" && plan.expiresAt && plan.expiresAt < new Date()) {
    plan.status = "expired";
    await plan.save();
  }

  return plan;
};

export const activateCommentPlan = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(403).json({ message: "Solo usuarios pueden activar planes" });
    }

    const { planType } = req.body;
    if (!PLAN_DEFINITIONS[planType]) {
      return res.status(400).json({ message: "Plan invalido" });
    }

    const planDef = PLAN_DEFINITIONS[planType];
    const startedAt = new Date();
    const expiresAt = new Date(startedAt.getTime() + planDef.days * 24 * 60 * 60 * 1000);

    const plan = await CommentPlan.findOneAndUpdate(
      { userId: req.user._id },
      {
        userId: req.user._id,
        planType,
        status: "active",
        badge: planDef.badge,
        startedAt,
        expiresAt
      },
      { new: true, upsert: true }
    );

    res.status(200).json({
      planType: plan.planType,
      status: plan.status,
      badge: plan.badge,
      startedAt: plan.startedAt,
      expiresAt: plan.expiresAt
    });
  } catch (error) {
    res.status(500).json({ message: "Error activando plan", error: error.message });
  }
};

export const getCommentPlanStatus = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(403).json({ message: "Solo usuarios pueden consultar planes" });
    }

    let plan = await CommentPlan.findOne({ userId: req.user._id });
    plan = await normalizePlanStatus(plan);

    if (!plan || plan.status !== "active") {
      const usage = await getUsage(req.user._id, "free");
      return res.status(200).json({
        planType: "free",
        status: "active",
        badge: null,
        startedAt: null,
        expiresAt: null,
        usage
      });
    }

    const usage = await getUsage(req.user._id, plan.planType);

    res.status(200).json({
      planType: plan.planType,
      status: plan.status,
      badge: plan.badge,
      startedAt: plan.startedAt,
      expiresAt: plan.expiresAt,
      usage
    });
  } catch (error) {
    res.status(500).json({ message: "Error consultando plan", error: error.message });
  }
};

export const cancelCommentPlan = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(403).json({ message: "Solo usuarios pueden cancelar planes" });
    }

    const plan = await CommentPlan.findOne({ userId: req.user._id, status: "active" });
    if (!plan) {
      return res.status(404).json({ message: "No hay plan activo" });
    }

    plan.status = "cancelled";
    plan.expiresAt = new Date();
    await plan.save();

    res.status(200).json({ message: "Plan cancelado", status: plan.status });
  } catch (error) {
    res.status(500).json({ message: "Error cancelando plan", error: error.message });
  }
};
