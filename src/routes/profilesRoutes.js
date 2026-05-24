import express from "express";
import { registerProfile, updateProfile, getProfileByID, getAllProfiles, searchProfiles, getProfileByUserId, createKYC, updateKYC, getKYC, getAllKYC } from "../controllers/profile.js";

const router = express.Router();

// ruta para profile
router.post("/createProfile", registerProfile);
router.get("/searchProfiles", searchProfiles);  
router.put("/updateProfile/:id", updateProfile);
router.get("/getProfile/:id", getProfileByID);
router.get("/getProfileByUser/:userId", getProfileByUserId);
router.get("/getAllProfiles", getAllProfiles);

// ruta para KYC
router.post("/createKYC", createKYC);
router.put("/updateKYC/:id", updateKYC);
router.get("/getKYC/:id", getKYC);
router.get("/getAllKYC", getAllKYC);


export default router;