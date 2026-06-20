import express from "express";
import { getAllProfiles, 
    activeProfile, 
    deleteProfile, 
    verifyKYC, 
    getAllUsers,
    deleteUserById,
    updateTopRojoStatus,
    getTopRojoList,
    updateCommentPlanStatus} from "../controllers/adminController.js";

const router = express.Router();

// ruta para profile
router.get("/getAllProfiles", getAllProfiles);
router.put("/activeProfile/:id", activeProfile);
router.delete("/deleteProfile/:id", deleteProfile);
// ruta para User
router.get("/getAllUsers", getAllUsers);
router.delete("/deleteUser/:id", deleteUserById);

// ruta para KYC
router.put("/verifyKYC/:kycId", verifyKYC);

// ruta para Top Rojo
router.get("/top-rojo", getTopRojoList);
router.put("/top-rojo/:topRojoId/status", updateTopRojoStatus);

// ruta para plan de comentarios
router.put("/comment-plan/:commentPlanId/status", updateCommentPlanStatus);

export default router;