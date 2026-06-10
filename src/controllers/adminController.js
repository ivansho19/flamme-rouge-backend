import mongoose from "mongoose";
import Profile from "../models/profile.js";
import User from "../models/User.js";
import IdentifyKYC from "../models/identifyKYC.js";
import TopRojo from "../models/TopRojo.js";
import { normalizeExpiredTopRojos } from "../services/topRojoStatusService.js";

const parserId = (id) => {
  return mongoose.Types.ObjectId(id);
};

const getPlanPriority = (plan) => {
  if (!Array.isArray(plan)) return 0;
  if (plan.includes("3")) return 3;
  if (plan.includes("2")) return 2;
  if (plan.includes("1")) return 1;
  return 0;
};

// Buscar todos los profiles ordenados por prioridad de plan (3 > 2 > 1)
export const getAllProfiles = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const name = typeof req.query.name === "string" ? req.query.name.trim() : "";
    const safePage = page < 1 ? 1 : page;
    const safeLimit = limit < 1 ? 10 : limit;
    const skip = (safePage - 1) * safeLimit;

    const filter = {};
    if (name) {
      filter.displayName = { $regex: name, $options: "i" };
    }

    const total = await Profile.countDocuments(filter);
    const profiles = await Profile.find(filter).lean();
    profiles.sort((a, b) => getPlanPriority(b.plan) - getPlanPriority(a.plan));

    const paginatedProfiles = profiles.slice(skip, skip + safeLimit);

    res.status(200).json({
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
      data: paginatedProfiles
    });
  } catch (error) {
    console.log("Error en getAllProfiles:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// Actualizar profile
export const activeProfile = async (req, res) => {
  const {
    isActiveProfile
  } = req.body;

  const { id } = req.params; // El id del perfil a actualizar

  try {
    const activeProfile = await Profile.findByIdAndUpdate(
      id,
      {
        isActiveProfile,
        updatedAt: Date.now()
      },
      { new: true }
    );

    if (!activeProfile) {
      return res.status(404).json({ message: "Perfil no encontrado" });
    }

    res.status(200).json({ message: "Perfil actualizado correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar el perfil", error: error.message });
  }
};

export const deleteProfile = async (req, res) => {
  const { id } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID de perfil inválido" });
    }

    const deletedProfile = await Profile.findByIdAndDelete(id);

    if (!deletedProfile) {
      return res.status(404).json({ message: "Perfil no encontrado" });
    }

    // Eliminar todos los registros de TopRojo asociados al perfil, si los hay
    await TopRojo.deleteMany({ profileId: id });

    res.status(200).json({ message: "Perfil eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar el perfil", error: error.message });
  }
};

// ==========================================
// ADMIN: Verificar identidad
// ==========================================
export const verifyKYC = async (req, res) => {
  try {
    const { kycId } = req.params; 
    const { verify } = req.body; 

    const kyc = await IdentifyKYC.findByIdAndUpdate(
      kycId,
      { verify },
      { new: true }
    );

    if (!kyc) {
      return res.status(404).json({ error: "KYC no encontrado." });
    }

    // Actualizar el estado de isVerify en el Profile del anunciante
    await Profile.findOneAndUpdate(
      { objectId: kyc.userId },
      { isVerify: verify }
    );

    res.json({ message: `KYC ${verify ? "aprobado" : "rechazado"}.` });
  } catch (error) {
    res.status(500).json({ error: 'Error al cambiar estado.' });
  }
};

// Buscar todos los user
export const getAllUsers = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const safePage = page < 1 ? 1 : page;
    const safeLimit = limit < 1 ? 10 : limit;
    const skip = (safePage - 1) * safeLimit;
    const filter = { isAdmin: false };

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean();

    res.status(200).json({
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
      data: users
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener los datos.', detalle: error.message });
  }
};

export const deleteUserById = async (req, res) => {
  const { id } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID de usuario invalido" });
    }

    const deletedUser = await User.findByIdAndDelete(id);

    if (!deletedUser) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    return res.status(200).json({ message: "Usuario eliminado correctamente" });
  } catch (error) {
    return res.status(500).json({ message: "Error al eliminar el usuario", error: error.message });
  }
};



// ADMIN: actualizar estado de Top Rojo
export const updateTopRojoStatus = async (req, res) => {
  try {
    const { topRojoId } = req.params;
    const { status } = req.body;

    const allowedStatuses = ["pending", "active", "expired", "cancelled"];

    if (!mongoose.Types.ObjectId.isValid(topRojoId)) {
      return res.status(400).json({ message: "ID de Top Rojo invalido" });
    }

    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Status invalido",
        allowedStatuses
      });
    }

    const topRojo = await TopRojo.findByIdAndUpdate(
      topRojoId,
      { status, updatedAt: Date.now() },
      { new: true }
    );

    if (!topRojo) {
      return res.status(404).json({ message: "Top Rojo no encontrado" });
    }

    return res.status(200).json({
      message: "Status de Top Rojo actualizado correctamente",
      data: {
        id: topRojo._id,
        status: topRojo.status,
        updatedAt: topRojo.updatedAt
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Error actualizando status de Top Rojo", error: error.message });
  }
};

// ADMIN: listar Top Rojo con filtro por status
export const getTopRojoList = async (req, res) => {
  try {
    await normalizeExpiredTopRojos();

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const status = typeof req.query.status === "string" ? req.query.status.trim() : "";
    const safePage = page < 1 ? 1 : page;
    const safeLimit = limit < 1 ? 10 : limit;
    const skip = (safePage - 1) * safeLimit;
    const allowedStatuses = ["pending", "active", "expired", "cancelled"];

    const filter = {};
    if (status) {
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          message: "Status invalido",
          allowedStatuses
        });
      }

      filter.status = status;
    }

    const total = await TopRojo.countDocuments(filter);
    const topRojos = await TopRojo.find(filter)
      .populate("profileId", "displayName imagesMain city country isActiveProfile")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean();

    return res.status(200).json({
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
      data: topRojos.map((topRojo) => ({
        id: topRojo._id,
        profileId: topRojo.profileId?._id || null,
        profile: topRojo.profileId
          ? {
              id: topRojo.profileId._id,
              displayName: topRojo.profileId.displayName,
              imagesMain: topRojo.profileId.imagesMain || null,
              city: topRojo.profileId.city || null,
              country: topRojo.profileId.country || null,
              isActiveProfile: topRojo.profileId.isActiveProfile ?? null
            }
          : null,
        userId: topRojo.userId,
        title: topRojo.title,
        description: topRojo.description,
        contactPhone: topRojo.contactPhone,
        images: topRojo.images,
        planType: topRojo.planType,
        city: topRojo.city,
        country: topRojo.country,
        startDate: topRojo.startDate,
        endDate: topRojo.endDate,
        status: topRojo.status,
        position: topRojo.position,
        viewCount: topRojo.viewCount,
        clickCount: topRojo.clickCount,
        createdAt: topRojo.createdAt,
        updatedAt: topRojo.updatedAt
      }))
    });
  } catch (error) {
    return res.status(500).json({ message: "Error obteniendo Top Rojo", error: error.message });
  }
};
