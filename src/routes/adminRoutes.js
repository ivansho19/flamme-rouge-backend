import express from "express";
import { getAllProfiles, 
    activeProfile, 
    deleteProfile, 
    verifyKYC, 
    getAllUsers,
    updateTopRojoStatus,
    getTopRojoList} from "../controllers/adminController.js";

const router = express.Router();

// ruta para profile
router.get("/getAllProfiles", getAllProfiles);
router.put("/activeProfile/:id", activeProfile);
router.delete("/deleteProfile/:id", deleteProfile);
// ruta para User
router.get("/getAllUsers", getAllUsers);

// ruta para KYC
router.put("/verifyKYC/:kycId", verifyKYC);

// ruta para Top Rojo
router.get("/top-rojo", getTopRojoList);
router.put("/top-rojo/:topRojoId/status", updateTopRojoStatus);

export default router;