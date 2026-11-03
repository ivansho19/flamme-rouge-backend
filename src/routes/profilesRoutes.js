import express from "express";
import {
  registerProfile,
  updateProfile,
  getProfileByID,
  getAllProfiles,
  searchProfiles,
  getProfileByUserId,
  createKYC,
  updateKYC,
  getKYC,
  getKYCByUser,
  getKYCByProfile,
  getAllKYC
} from "../controllers/profile.js";
import protect from "../middlewares/authMiddleware.js";
import optionalAuth from "../middlewares/optionalAuthMiddleware.js";
import { publicRateLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();

// ruta para profile
router.post("/createProfile", protect, registerProfile);
router.get("/searchProfiles", publicRateLimiter, searchProfiles);
router.put("/updateProfile/:id", protect, updateProfile);
router.get("/getProfile/:id", publicRateLimiter, optionalAuth, getProfileByID);
router.get("/getProfileByUser/:userId", publicRateLimiter, optionalAuth, getProfileByUserId);
router.get("/getAllProfiles", publicRateLimiter, getAllProfiles);

// ruta para KYC
router.post("/createKYC", protect, createKYC);
router.put("/updateKYC/:kycId", protect, updateKYC);
router.get("/getKYCByUser/:userId", protect, getKYCByUser);
router.get("/getKYCByProfile/:profileId", protect, getKYCByProfile);
router.get("/getKYC/:id", protect, getKYC); // legacy: id = userId
router.get("/getAllKYC", protect, getAllKYC);

export default router;
