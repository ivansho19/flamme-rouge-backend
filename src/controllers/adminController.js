import mongoose from "mongoose";
import Profile from "../models/profile.js";
import IdentifyKYC from "../models/identifyKYC.js";
import TopRojo from "../models/TopRojo.js";

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
