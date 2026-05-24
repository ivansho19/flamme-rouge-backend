import express from "express";
import {
  getNotifications,
  getProfileNotifications,
  markAllNotificationsRead,
  markNotificationsRead
} from "../controllers/notificationController.js";
import protect from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", getNotifications);
router.get("/profile/:profileId", protect, getProfileNotifications);
router.post("/mark-read", markNotificationsRead);
router.post("/mark-all-read", markAllNotificationsRead);

export default router;
