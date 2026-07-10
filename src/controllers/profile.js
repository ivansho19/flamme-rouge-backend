
import mongoose from "mongoose";
import Profile from "../models/profile.js";
import IdentifyKYC from "../models/identifyKYC.js";
import { getRequestCountry, isCountryBlocked, isRequestBlocked } from "../middlewares/geoBlocking.js";
import { notifyAdmin } from "../utils/notification.js";

const parserId = (id) => {
  return mongoose.Types.ObjectId(id);
};

// Registro de profile
export const registerProfile = async (req, res) => {
  const {
    objectId,
    displayName,
    bio,
    phone,
    country,
    city,
    zone,
    availability,
    gender,
    orientation,
    age,
    nationality,
    height,
    weight,
    hairColor,
    eyeColor,
    languages,
    plan,
    planExpiresAt,
    imagesMain,
    imagesGallery,
    posibilities,
    alcohol,
    cigarette,
    birthDate,
    isActiveProfile,
    isVerify,
    blockedCountries,
    promoCode, // <-- Recibimos el código desde el frontend
    promoDurationDays // <-- Cantidad de días de duración de la promo
  } = req.body;

  try {
    let computedPlanExpiresAt = planExpiresAt;
    let computedIsActiveProfile = isActiveProfile;
    let computedPlan = plan;

    // Validación del código para el plan gratis
    // Puedes definir tu código en el .env o usar el valor por defecto "GRATIS7DIAS"
    const validPromoCode = process.env.FREE_PLAN_CODE || "GRATIS7DIAS";

    if (promoCode && promoCode === validPromoCode) {
      // Priorizar promoDurationDays si fue enviado y es un número válido, de lo contrario usar 7 como fallback
      const daysToAdd = (promoDurationDays && !isNaN(promoDurationDays)) ? Number(promoDurationDays) : 7;
      
      // Asignar vencimiento a "daysToAdd" días exactos a partir de ahora
      computedPlanExpiresAt = new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000);
      // Activar el perfil automáticamente
      computedIsActiveProfile = true;
      // Asignar el plan a "free" si viene vacío
      if (!computedPlan || computedPlan.length === 0) {
        computedPlan = ["free"];
      }
    } else if (!computedPlanExpiresAt && computedPlan && computedPlan.length > 0) {
      computedPlanExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days default
    }

    const profile = await Profile.create({
      objectId,
      displayName,
      bio,
      phone,
      country,
      city,
      zone,
      availability,
      gender,
      orientation,
      age,
      nationality,
      height,
      weight,
      hairColor,
      eyeColor,
      languages,
      plan: computedPlan,
      planExpiresAt: computedPlanExpiresAt,
      imagesMain,
      imagesGallery,
      posibilities,
      alcohol,
      cigarette,
      birthDate,
      isActiveProfile: computedIsActiveProfile,
      isVerify,
      blockedCountries
    });

    await notifyAdmin({
      type: "profile_created",
      title: "Nuevo perfil creado",
      message: `Se creo el perfil ${profile.displayName}`,
      targetId: profile._id,
      meta: { profileId: profile._id, objectId: profile.objectId }
    });

    res.status(201).json({
      profile: {
        _id: profile._id,
        displayName: profile.displayName
      },
      profile
    });
  } catch (error) {
    res.status(500).json({ message: "Error en el servidor", error: error.message });
  }
};


const mapProfileResponse = (profile) => ({
  _id: profile._id,
  objectId: profile.objectId,
  displayName: profile.displayName,
  bio: profile.bio,
  phone: profile.phone,
  city: profile.city,
  country: profile.country,
  availability: profile.availability,
  gender: profile.gender,
  age: profile.age,
  nationality: profile.nationality,
  height: profile.height,
  weight: profile.weight,
  hairColor: profile.hairColor,
  eyeColor: profile.eyeColor,
  languages: profile.languages,
  plan: profile.plan,
  planExpiresAt: profile.planExpiresAt,
  imagesGallery: profile.imagesGallery,
  imagesMain: profile.imagesMain,
  birthDate: profile.birthDate,
  posibilities: profile.posibilities,
  zone: profile.zone,
  orientation: profile.orientation,
  alcohol: profile.alcohol,
  cigarette: profile.cigarette,
  isActiveProfile: profile.isActiveProfile,
  isVerify: profile.isVerify,
  blockedCountries: profile.blockedCountries || []
});

export const normalizeExpiredProfiles = async () => {
  try {
    const now = new Date();
    await Profile.updateMany(
      { isActiveProfile: true, planExpiresAt: { $lt: now } },
      { $set: { isActiveProfile: false } }
    );
  } catch (error) {
    console.error("Error normalizando perfiles expirados:", error);
  }
};

// Buscar profile por ID
export const getProfileByID = async (req, res) => {
  const { id } = req.params;
  try {
    await normalizeExpiredProfiles();
    
    const profile = await Profile.findById(id);
    if (!profile) {
      return res.status(404).json({ message: "Perfil no encontrado" });
    }

    if (isRequestBlocked(req, profile.blockedCountries)) {
      return res.status(403).json({
        message: "No se puede acceder a este perfil desde tu país"
      });
    }

    const isAuthenticated = req.user || req.client;
    const authId = req.user?._id || req.client?._id;
    const isOwner =
      isAuthenticated &&
      profile.objectId &&
      authId &&
      profile.objectId.toString() === authId.toString();
    const isAdmin = req.user && req.user.isAdmin;
    const canViewInactive = isOwner || isAdmin;

    if (!profile.isActiveProfile && !canViewInactive) {
      return res.status(403).json({ message: "Perfil inactivo" });
    }

    if (!profile.isActiveProfile && canViewInactive) {
      return res.status(200).json({
        warning: "Perfil inactivo",
        profile: mapProfileResponse(profile)
      });
    }

    return res.status(200).json({
      profile: mapProfileResponse(profile)
    });
  } catch (error) {
    console.log("Error en getProfileByID:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// GET /getProfileByUser/:userId
export const getProfileByUserId = async (req, res) => {
  const { userId } = req.params;
  try {
    await normalizeExpiredProfiles();

    const profile = await Profile.findOne({ objectId: userId });
    if (!profile) {
      return res.status(404).json({ message: "Perfil no encontrado" });
    }

    if (isRequestBlocked(req, profile.blockedCountries)) {
      return res.status(403).json({
        message: "No se puede acceder a este perfil desde tu país"
      });
    }

    const isAuthenticated = req.user || req.client;
    const authId = req.user?._id || req.client?._id;
    const isOwner =
      isAuthenticated &&
      profile.objectId &&
      authId &&
      profile.objectId.toString() === authId.toString();
    const isAdmin = req.user && req.user.isAdmin;
    const canViewInactive = isOwner || isAdmin;

    if (!profile.isActiveProfile && !canViewInactive) {
      return res.status(403).json({ message: "Perfil inactivo" });
    }

    if (!profile.isActiveProfile && canViewInactive) {
      return res.status(200).json({
        warning: "Perfil inactivo",
        profile: mapProfileResponse(profile)
      });
    }

    return res.status(200).json({
      profile: mapProfileResponse(profile)
    });
  } catch (error) {
    res.status(500).json({ message: "Error en el servidor" });
  }
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
    await normalizeExpiredProfiles();

    const profiles = await Profile.find({ isActiveProfile: true }).lean();
    const requestCountry = getRequestCountry(req);

    const visibleProfiles = requestCountry
      ? profiles.filter((profile) => !isCountryBlocked(requestCountry, profile.blockedCountries))
      : profiles;

    visibleProfiles.sort((a, b) => getPlanPriority(b.plan) - getPlanPriority(a.plan));
    res.status(200).json(visibleProfiles);
  } catch (error) {
    console.log("Error en getAllProfiles:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// Actualizar profile
export const updateProfile = async (req, res) => {
  const {
    displayName,
    bio,
    phone,
    city,
    country,
    zone,
    availability,
    gender,
    orientation,
    age,
    nationality,
    height,
    weight,
    hairColor,
    eyeColor,
    birthDate,
    languages,
    plan,
    planExpiresAt,
    posibilities,
    imagesMain,
    imagesGallery,
    alcohol,
    cigarette,
    isActiveProfile,
    blockedCountries
  } = req.body;

  const { id } = req.params; // El id del perfil a actualizar

  try {
    const existingProfile = await Profile.findById(id);
    if (!existingProfile) {
      return res.status(404).json({ message: "Perfil no encontrado" });
    }

    let computedPlanExpiresAt = planExpiresAt;
    if (plan && JSON.stringify(plan) !== JSON.stringify(existingProfile.plan)) {
      computedPlanExpiresAt = planExpiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    } else if (!planExpiresAt) {
      computedPlanExpiresAt = existingProfile.planExpiresAt;
    }

    const updatedProfile = await Profile.findByIdAndUpdate(
      id,
      {
        displayName,
        bio,
        phone,
        city,
        country,
        zone,
        availability,
        gender,
        orientation,
        age,
        nationality,
        height,
        weight,
        hairColor,
        eyeColor,
        languages,
        plan,
        planExpiresAt: computedPlanExpiresAt,
        birthDate,
        imagesMain,
        imagesGallery,
        posibilities,
        alcohol,
        cigarette,
        isActiveProfile,
        blockedCountries,
        updatedAt: Date.now()
      },
      { new: true }
    );

    if (!updatedProfile) {
      return res.status(404).json({ message: "Perfil no encontrado" });
    }

    res.status(200).json({ message: "Perfil actualizado correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar el perfil", error: error.message });
  }
};


// Buscar profile por cualquiera de sus campos
export const searchProfiles = async (req, res) => {
  const { query } = req.query; // El término de búsqueda

  if (!query || !query.toString().trim()) {
    return res.status(400).json({ message: "El parámetro 'query' es obligatorio" });
  }

  try {
    await normalizeExpiredProfiles();

    const schemaPaths = Profile.schema.paths;

    const fieldCandidates = [
      "displayName",
      "nationality",
      "city",
      "zone",
      "availability",
      "gender",
      "languages",
      "age",
      "height",
      "weight"
    ];

    const orClauses = [];
    const normalizedQuery = query.toString();
    const numericValue = Number(normalizedQuery);
    const isNumericQuery = !Number.isNaN(numericValue);

    for (const field of fieldCandidates) {
      const path = schemaPaths[field];
      if (!path) continue;

      const fieldType = path.instance; // String, Number, Array, ObjectID, etc.

      if (fieldType === "String") {
        orClauses.push({ [field]: { $regex: normalizedQuery, $options: "i" } });
      } else if (fieldType === "Number") {
        if (isNumericQuery) {
          orClauses.push({ [field]: numericValue });
        }
      } else if (fieldType === "Array") {
        // asume arrays de String (availability, languages)
        orClauses.push({ [field]: { $in: [new RegExp(normalizedQuery, "i")] } });
      }
    }

    if (!orClauses.length) {
      return res.status(200).json([]);
    }

    const profiles = await Profile.find({ isActiveProfile: true, $or: orClauses });
    const requestCountry = getRequestCountry(req);

    const visibleProfiles = requestCountry
      ? profiles.filter((profile) => !isCountryBlocked(requestCountry, profile.blockedCountries))
      : profiles;

    res.status(200).json(visibleProfiles);
  } catch (error) {
    console.log("Error en searchProfiles:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// ==========================================
// CREATE: Crear perfil KYC
// ==========================================
export const createKYC = async (req, res) => {
  const {
    userId,
    fullName,
    age,
    nationality,
    phone,
    email,
    documentImage
  } = req.body;

  const existingKYC = await IdentifyKYC.findOne({ userId });
    if (existingKYC) {
      return res.status(400).json({ error: 'El usuario ya tiene un perfil KYC.' });
    }

  try {
    const newKYC = await IdentifyKYC.create({
      userId,
      fullName,
      age,
      nationality,
      phone,
      email,
      documentImage
    });

    res.status(201).json({ message: 'KYC guardado exitosamente', data: newKYC });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Este documento ya está registrado.' });
    }
    res.status(500).json({ error: 'Error al procesar el KYC.', detalle: error.message });
  }
};

// ==========================================
// READ: Obtener el KYC del usuario
// ==========================================
export const getKYC = async (req, res) => {
  try {
    const kyc = await IdentifyKYC.findOne({ userId: req.userId });
    if (!kyc) return res.status(404).json({ error: 'Perfil KYC no encontrado.' });
    res.json({ data: kyc });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener los datos.' });
  }
};

// ==========================================
// READ: Obtener todos los KYC
// ==========================================
export const getAllKYC = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const safePage = page < 1 ? 1 : page;
    const safeLimit = limit < 1 ? 10 : limit;
    const skip = (safePage - 1) * safeLimit;

    const total = await IdentifyKYC.countDocuments();
    const kycs = await IdentifyKYC.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean();

    res.status(200).json({
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
      data: kycs
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener los datos.', detalle: error.message });
  }
};

// ==========================================
// UPDATE: Actualizar KYC (Ej: si se rechazó y sube nuevo documento)
// ==========================================
export const updateKYC = async (req, res) => {
  const { kycId } = req.params; 
  const {
    fullName,
    age,
    nationality,
    phone,
    email,
    documentImage
  } = req.body;

  try {
    const kyc = await IdentifyKYC.findByIdAndUpdate(kycId, { fullName, age, nationality, phone, email, documentImage }, { new: true });
    if (!kyc) return res.status(404).json({ error: 'KYC no encontrado.' });

    res.json({ message: 'KYC actualizado exitosamente.', data: kyc });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar el KYC.', detalle: error.message });
  }
};


