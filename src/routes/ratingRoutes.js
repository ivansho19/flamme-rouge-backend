import express from "express";
import { toggleLike, getLikesByProfile, checkUserLike } from "../controllers/ratingControllers.js";

const router = express.Router();

// POST /api/ratings/toggle - Dar o quitar un like a un perfil
router.post("/toggle", toggleLike);

// GET /api/ratings/profile/:profileId - Obtener el total de likes de un perfil
router.get("/profile/:profileId", getLikesByProfile);

// GET /api/ratings/profile/:profileId/user/:userId - Verificar si un usuario le dio like a un perfil
router.get("/profile/:profileId/user/:userId", checkUserLike);

export default router;