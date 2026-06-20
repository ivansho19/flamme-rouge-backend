import CommentPlan from "../models/CommentPlan.js";
import CommentProfiles from "../models/commentProfiles.js";
import { notifyAdmin } from "../utils/notification.js";

const PLAN_DEFINITIONS = {
  monthly: { days: 30, limit: 4, badge: "Miembro" },
  annual: { days: 365, limit: null, badge: "Hombre Top" }
};

const getUsage = async (userId, plan) => {
  if (plan?.planType === "monthly") {
    const since = plan.startedAt || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const count = await CommentProfiles.countDocuments({
      authorId: userId,
      createdAt: { $gte: since }
    });
    return { used: count, limit: PLAN_DEFINITIONS.monthly.limit, window: "plan_cycle" };
  }

  if (plan?.planType === "annual") {
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

    const { planType, status = "pending" } = req.body;
    const allowedStatuses = ["pending", "active"];

    if (!PLAN_DEFINITIONS[planType]) {
      return res.status(400).json({ message: "Plan invalido" });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Status invalido. Valores permitidos: pending, active" });
    }

    const planDef = PLAN_DEFINITIONS[planType];
    const startedAt = new Date();
    const expiresAt = new Date(startedAt.getTime() + planDef.days * 24 * 60 * 60 * 1000);

    const plan = await CommentPlan.findOneAndUpdate(
      { userId: req.user._id },
      {
        userId: req.user._id,
        planType,
        status,
        badge: planDef.badge,
        // Solo establecer fechas si el plan se activa inmediatamente
        ...(status === "active" ? { startedAt, expiresAt } : {})
      },
      { new: true, upsert: true }
    );

    await notifyAdmin({
      type: "comment_plan",
      title: status === "active" ? "Plan de comentarios activado" : "Plan de comentarios pendiente",
      message: status === "active"
        ? `Usuario ${req.user._id} activo plan ${plan.planType}`
        : `Usuario ${req.user._id} solicito plan ${plan.planType} en estado pendiente`,
      targetId: req.user._id,
      meta: { userId: req.user._id, planType: plan.planType, status: plan.status }
    });

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

    if (!plan) {
      const usage = await getUsage(req.user._id, null);
      return res.status(200).json({
        planType: "free",
        status: "active",
        badge: null,
        startedAt: null,
        expiresAt: null,
        usage
      });
    }

    if (plan.status === "pending") {
      const usage = await getUsage(req.user._id, null);
      return res.status(200).json({
        planType: plan.planType,
        status: plan.status,
        badge: plan.badge,
        startedAt: plan.startedAt,
        expiresAt: plan.expiresAt,
        usage
      });
    }

    if (plan.status !== "active") {
      const usage = await getUsage(req.user._id, null);
      return res.status(200).json({
        planType: "free",
        status: "active",
        badge: null,
        startedAt: null,
        expiresAt: null,
        usage
      });
    }

    const usage = await getUsage(req.user._id, plan);

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
