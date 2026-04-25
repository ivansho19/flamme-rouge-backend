import express from "express";
import {
  getCommentsByProfile,
  addProviderReply,
  createComment
} from "../controllers/comments.js";

const router = express.Router();

// GET /api/comments/profile/:profileId - Obtiene todos los comentarios de un perfil
router.get("/profile/:profileId", getCommentsByProfile);

// POST /api/comments - Crea un nuevo comentario en un perfil
router.post("/", createComment);

// PATCH /api/comments/:commentId/reply - Permite al dueño del perfil responder a un comentario
router.patch("/:commentId/reply", addProviderReply);

export default router;
