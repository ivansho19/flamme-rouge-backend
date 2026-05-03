import mongoose from "mongoose";
import Rating from "../models/ratings.js";

// 1. Dar o quitar like (Toggle)
export const toggleLike = async (req, res) => {
  const { profileId, userId } = req.body;

  if (!profileId || !userId) {
    return res.status(400).json({ message: "Faltan datos obligatorios: profileId y userId" });
  }

  if (!mongoose.Types.ObjectId.isValid(profileId) || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "ID de perfil o usuario inválido" });
  }

  try {
    // Verificar si el like ya existe
    const existingLike = await Rating.findOne({ profileId, userId });

    if (existingLike) {
      // Si existe, lo eliminamos (Quitar like)
      await Rating.findByIdAndDelete(existingLike._id);
      return res.status(200).json({ message: "Like removido correctamente", isLiked: false });
    } else {
      // Si no existe, lo creamos (Dar like)
      const newLike = await Rating.create({ profileId, userId });
      return res.status(201).json({ message: "Like agregado correctamente", isLiked: true, like: newLike });
    }
  } catch (error) {
    console.error("Error en toggleLike:", error);
    res.status(500).json({ message: "Error en el servidor", error: error.message });
  }
};

// 2. Obtener la cantidad de likes de un perfil
export const getLikesByProfile = async (req, res) => {
  const { profileId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(profileId)) {
    return res.status(400).json({ message: "ID de perfil inválido" });
  }

  try {
    const likesCount = await Rating.countDocuments({ profileId });
    res.status(200).json({ profileId, likesCount });
  } catch (error) {
    console.error("Error en getLikesByProfile:", error);
    res.status(500).json({ message: "Error en el servidor", error: error.message });
  }
};

// 3. Verificar si un usuario específico le dio like a un perfil
export const checkUserLike = async (req, res) => {
  const { profileId, userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(profileId) || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "ID inválido" });
  }

  try {
    const like = await Rating.findOne({ profileId, userId });
    res.status(200).json({ isLiked: !!like });
  } catch (error) {
    console.error("Error en checkUserLike:", error);
    res.status(500).json({ message: "Error en el servidor", error: error.message });
  }
};