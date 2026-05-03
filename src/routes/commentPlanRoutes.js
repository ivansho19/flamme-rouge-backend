import express from "express";
import protect from "../middlewares/authMiddleware.js";
import {
  activateCommentPlan,
  cancelCommentPlan,
  getCommentPlanStatus
} from "../controllers/commentPlanController.js";

const router = express.Router();

router.post("/activate", protect, activateCommentPlan);
router.get("/status", protect, getCommentPlanStatus);
router.post("/cancel", protect, cancelCommentPlan);

export default router;
