import express from "express";
import { getAllProfiles, activeProfile, deleteProfile, verifyKYC} from "../controllers/adminController.js";

const router = express.Router();

// ruta para profile
router.get("/getAllProfiles", getAllProfiles);
router.put("/activeProfile/:id", activeProfile);
router.delete("/deleteProfile/:id", deleteProfile);

// ruta para KYC
router.put("/verifyKYC/:kycId", verifyKYC);

export default router;