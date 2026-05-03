import mongoose from "mongoose";
import User from "../models/User.js";
import Client from "../models/Client.js";
import Profile from "../models/profile.js";
import CommentProfiles from "../models/commentProfiles.js";
import CommentPlan from "../models/CommentPlan.js";

const canUserComment = async (userId) => {
  const now = new Date();
  const plan = await CommentPlan.findOne({ userId, status: "active" });

  if (plan && plan.expiresAt && plan.expiresAt < now) {
    plan.status = "expired";
    await plan.save();
  }

  if (!plan || plan.status !== "active") {
    const totalComments = await CommentProfiles.countDocuments({ authorId: userId });
    return {
      allowed: totalComments < 1,
      reason: totalComments < 1 ? null : "Plan gratis permite 1 comentario"
    };
  }

  if (plan.planType === "monthly") {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const count = await CommentProfiles.countDocuments({
      authorId: userId,
      createdAt: { $gte: since }
    });
    return {
      allowed: count < 4,
      reason: count < 4 ? null : "Limite mensual de 4 comentarios alcanzado"
    };
  }

  return { allowed: true, reason: null };
};

// 1. Obtener los comentarios de un perfil
export const getCommentsByProfile = async (req, res) => {
  const { profileId } = req.params; // ID del perfil a consultar

  if (!mongoose.Types.ObjectId.isValid(profileId)) {
      return res.status(400).json({ message: "ID de perfil inválido" });
  }

  try {
    // El comentario se asocia al dueño del perfil, no al perfil mismo.
    // Primero, encontramos el perfil para saber quién es el dueño (targetUserId).
    const profile = await Profile.findById(profileId);
    if (!profile) {
      return res.status(404).json({ message: "Perfil no encontrado" });
    }

    // El dueño del perfil (puede ser User o Client, según la lógica de login)
    const targetUserId = profile.objectId;

    // Buscamos los comentarios dirigidos a ese usuario.
    const comments = await CommentProfiles.find({ targetUserId })
      .sort({ createdAt: -1 })
      .lean(); // Usar lean() para objetos JS planos, más rápido.

    // Enriquecer los comentarios con la información del autor.
    const commentsWithAuthorDetails = await Promise.all(
      comments.map(async (comment) => {
        // El autor puede ser un 'User' o un 'Client'. Buscamos en ambas colecciones.
        let author = await Client.findById(comment.authorId).select('name lastName').lean();
        if (!author) {
          author = await User.findById(comment.authorId).select('name lastName').lean();
        }

        return {
          ...comment,
          author: author 
            ? { name: `${author.name} ${author.lastName}` }
            : { name: "Usuario Anónimo" },
        };
      })
    );

    res.status(200).json(commentsWithAuthorDetails);
  } catch (error) {
    console.error("Error al obtener comentarios:", error);
    res.status(500).json({ message: "Error en el servidor", error: error.message });
  }
};

// 3. Responder a un comentario (dueño del perfil)
export const addProviderReply = async (req, res) => {
  const { commentId } = req.params;
  // El userId debería venir de un usuario autenticado (ej. req.user.id)
  const { replyText, userId } = req.body;

  if (!replyText) {
    return res.status(400).json({ message: "El texto de la respuesta es obligatorio" });
  }

  if (!mongoose.Types.ObjectId.isValid(commentId) || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "ID de comentario o usuario inválido" });
  }

  try {
    // 1. Encontrar el comentario.
    const comment = await CommentProfiles.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comentario no encontrado" });
    }

    // 2. Autorización: Verificar que el usuario que responde es el dueño del perfil comentado.
    if (!comment.targetUserId.equals(userId)) {
      return res.status(403).json({ message: "No tienes permiso para responder a este comentario" });
    }

    // 3. Actualizar y guardar la respuesta.
    comment.providerReply = replyText;
    const updatedComment = await comment.save();

    res.status(200).json({ message: "Respuesta añadida exitosamente", comment: updatedComment });
  } catch (error) {
    console.error("Error al añadir respuesta:", error);
    res.status(500).json({ message: "Error en el servidor", error: error.message });
  }
};

// 2. Dejar un comentario en un perfil
export const createComment = async (req, res) => {
  // El authorId debería venir de un usuario autenticado (ej. req.user.id)
  // El profileId es el perfil que se está comentando.
  const { profileId, rating, text } = req.body;

  if (!profileId || !text) {
    return res.status(400).json({ message: "Faltan campos obligatorios: profileId, text" });
  }

  if (!mongoose.Types.ObjectId.isValid(profileId)) {
      return res.status(400).json({ message: "ID de perfil inválido" });
  }

  try {
    if (!req.user) {
      return res.status(403).json({ message: "Solo usuarios pueden comentar" });
    }

    const authorId = req.user._id;

    // 1. Encontrar el perfil para obtener el ID de su dueño (targetUserId).
    const profile = await Profile.findById(profileId);
    if (!profile) {
      return res.status(404).json({ message: "Perfil de destino no encontrado" });
    }
    const targetUserId = profile.objectId;

    // 2. Validar que el autor existe.
    const authorExists = await User.findById(authorId);
    if (!authorExists) {
      return res.status(404).json({ message: "El autor del comentario no existe" });
    }

    // 3. Evitar que un usuario comente su propio perfil.
    if (targetUserId.equals(authorId)) {
      return res.status(403).json({ message: "No puedes comentar en tu propio perfil" });
    }

    // 4. Crear y guardar el comentario.
    const permission = await canUserComment(authorId);
    if (!permission.allowed) {
      return res.status(403).json({ message: permission.reason });
    }

    const newComment = await CommentProfiles.create({
      targetUserId,
      authorId,
      rating,
      text,
    });

    res.status(201).json({ message: "Comentario añadido exitosamente", comment: newComment });
  } catch (error) {
    console.error("Error al crear comentario:", error);
    res.status(500).json({ message: "Error en el servidor", error: error.message });
  }
};