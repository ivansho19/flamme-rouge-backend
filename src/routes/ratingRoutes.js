import express from "express";
import { toggleLike, getLikesByProfile, checkUserLike } from "../controllers/ratingControllers.js";
import protect from "../middlewares/authMiddleware.js";
import optionalAuth from "../middlewares/optionalAuthMiddleware.js";
import { publicRateLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();

// POST /api/ratings/toggle - Dar o quitar un like a un perfil
router.post("/toggle", protect, toggleLike);

// GET /api/ratings/profile/:profileId - Obtener el total de likes de un perfil
router.get("/profile/:profileId", publicRateLimiter, optionalAuth, getLikesByProfile);

// GET /api/ratings/profile/:profileId/user/:userId - Verificar si un usuario le dio like a un perfil
router.get("/profile/:profileId/user/:userId", protect, checkUserLike);

export default router;