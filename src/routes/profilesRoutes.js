import express from "express";
import { registerProfile, updateProfile, getProfileByID, getAllProfiles } from "../controllers/profile.js";

const router = express.Router();

// ruta para profile
router.post("/createProfile", registerProfile);
router.put("/updateProfile/:id", updateProfile);
router.get("/getProfile/:id", getProfileByID);
router.get("/getAllProfiles", getAllProfiles);


export default router;