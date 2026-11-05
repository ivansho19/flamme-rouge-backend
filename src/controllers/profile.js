import mongoose from "mongoose";
import Profile from "../models/profile.js";
import IdentifyKYC from "../models/identifyKYC.js";
import { getRequestCountry, isCountryBlocked, isRequestBlocked } from "../middlewares/geoBlocking.js";
import { notifyAdmin } from "../utils/notification.js";
import sendRegistrationEmail from "../utils/sendRegistrationEmail.js";

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
    email,
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
      email,
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

    // Correo de bienvenida con el plan seleccionado (incluye free/promo)
    await sendRegistrationEmail({
      name: profile.displayName || profile.email,
      email: profile.email,
      role: "anunciante",
      plan: profile.plan
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
  email: profile.email,
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

/** Fisher–Yates shuffle (nuevo orden en cada petición) */
const shuffleInPlace = (list) => {
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
};

/**
 * Orden público del home:
 * 1) VIP (plan 3) rotan entre sí
 * 2) Pro (plan 2) rotan entre sí
 * 3) Básico / resto quedan en su orden original (sin rotar)
 * VIP siempre arriba de Pro; Pro arriba del resto.
 */
const orderProfilesWithVipProRotation = (profiles) => {
  const vip = [];
  const pro = [];
  const rest = [];

  for (const profile of profiles) {
    const priority = getPlanPriority(profile.plan);
    if (priority === 3) vip.push(profile);
    else if (priority === 2) pro.push(profile);
    else rest.push(profile);
  }

  shuffleInPlace(vip);
  shuffleInPlace(pro);

  return [...vip, ...pro, ...rest];
};

// Buscar todos los profiles: VIP/Pro rotan en cada request; Básico fijo al final del bloque
export const getAllProfiles = async (req, res) => {
  try {
    await normalizeExpiredProfiles();

    const profiles = await Profile.find({ isActiveProfile: true }).lean();
    const requestCountry = getRequestCountry(req);

    const visibleProfiles = requestCountry
      ? profiles.filter((profile) => !isCountryBlocked(requestCountry, profile.blockedCountries))
      : profiles;

    res.status(200).json(orderProfilesWithVipProRotation(visibleProfiles));
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
    blockedCountries, 
    email
  } = req.body;

  const { id } = req.params; // El id del perfil a actualizar

  try {
    const existingProfile = await Profile.findById(id);
    if (!existingProfile) {
      return res.status(404).json({ message: "Perfil no encontrado" });
    }

    // Verificar permisos: Solo el dueño del perfil o un admin pueden actualizar
    const isAuthenticated = req.user || req.client;
    const authId = req.user?._id || req.client?._id;
    const isOwner = isAuthenticated && existingProfile.objectId && authId && existingProfile.objectId.toString() === authId.toString();
    const isAdmin = req.user && req.user.isAdmin;

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Acceso denegado: No tienes permisos para actualizar este perfil" });
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
        email,
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

const getAuthActor = (req) => req.user || req.client || null;

const isAdminActor = (actor) => Boolean(actor?.isAdmin);

const canAccessUserKyc = (req, userId) => {
  const actor = getAuthActor(req);
  if (!actor) return false;
  if (isAdminActor(actor)) return true;
  return String(actor._id) === String(userId);
};

const normalizeDocumentImage = (documentImage) => {
  if (documentImage == null) return undefined;
  if (Array.isArray(documentImage)) return documentImage;
  if (typeof documentImage === "object" && documentImage.url && documentImage.public_id) {
    return [documentImage];
  }
  return [];
};

const imagesChanged = (prevImages = [], nextImages) => {
  if (nextImages === undefined) return false;
  return JSON.stringify(prevImages || []) !== JSON.stringify(nextImages || []);
};

const identityChanged = (kyc, payload) => {
  const fields = ["fullName", "age", "nationality", "documentType", "documentNumber"];
  return fields.some((field) => {
    if (payload[field] === undefined) return false;
    return String(kyc[field] ?? "") !== String(payload[field] ?? "");
  });
};

const mapKycResponse = async (kycDoc) => {
  const kyc = kycDoc?.toObject ? kycDoc.toObject() : { ...kycDoc };
  const profile = await Profile.findOne({ objectId: kyc.userId })
    .select("_id")
    .lean();

  return {
    _id: kyc._id,
    userId: kyc.userId,
    profileId: profile?._id || null,
    fullName: kyc.fullName,
    age: kyc.age,
    nationality: kyc.nationality,
    phone: kyc.phone,
    email: kyc.email,
    documentType: kyc.documentType || null,
    documentNumber: kyc.documentNumber ?? null,
    documentImage: Array.isArray(kyc.documentImage) ? kyc.documentImage : [],
    verify: Boolean(kyc.verify),
    status: kyc.status || (kyc.verify ? "verified" : "pending"),
    createdAt: kyc.createdAt,
    updatedAt: kyc.updatedAt
  };
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
    documentType,
    documentNumber,
    documentImage
  } = req.body;

  try {
    if (!userId || !fullName || documentImage == null) {
      return res.status(400).json({
        message: "userId, fullName y documentImage son obligatorios"
      });
    }

    if (!canAccessUserKyc(req, userId)) {
      return res.status(403).json({ message: "No autorizado" });
    }

    const existingKYC = await IdentifyKYC.findOne({ userId });
    if (existingKYC) {
      // Compat: el front histórico espera 400 (no se crea un segundo KYC)
      return res.status(400).json({
        error: "El usuario ya tiene un perfil KYC.",
        message: "El usuario ya tiene un perfil KYC.",
        kycId: existingKYC._id
      });
    }

    const images = normalizeDocumentImage(documentImage);
    if (!images?.length) {
      return res.status(400).json({
        message: "documentImage debe incluir al menos una imagen con url y public_id"
      });
    }

    const newKYC = await IdentifyKYC.create({
      userId,
      fullName,
      age,
      nationality,
      phone,
      email,
      documentType,
      documentNumber: documentNumber ?? null,
      documentImage: images,
      verify: false,
      status: "pending"
    });

    const kyc = await mapKycResponse(newKYC);
    res.status(201).json({
      message: "KYC guardado exitosamente",
      data: newKYC,
      kyc
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        error: "El usuario ya tiene un perfil KYC.",
        message: "El usuario ya tiene un perfil KYC."
      });
    }
    res.status(500).json({
      error: "Error al procesar el KYC.",
      message: "Error al procesar el KYC.",
      detalle: error.message
    });
  }
};

// ==========================================
// READ: Obtener KYC por userId (dueño o admin)
// ==========================================
export const getKYCByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "userId inválido" });
    }

    if (!canAccessUserKyc(req, userId)) {
      return res.status(403).json({ message: "No autorizado" });
    }

    const kycDoc = await IdentifyKYC.findOne({ userId });
    if (!kycDoc) {
      return res.status(404).json({
        message: "KYC no encontrado para este usuario",
        kyc: null
      });
    }

    const kyc = await mapKycResponse(kycDoc);
    return res.status(200).json({ kyc });
  } catch (error) {
    return res.status(500).json({
      message: "Error al obtener el KYC",
      detalle: error.message
    });
  }
};

// ==========================================
// READ: Obtener KYC por profileId (dueño o admin)
// ==========================================
export const getKYCByProfile = async (req, res) => {
  try {
    const { profileId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(profileId)) {
      return res.status(400).json({ message: "profileId inválido" });
    }

    const profile = await Profile.findById(profileId).select("objectId").lean();
    if (!profile) {
      return res.status(404).json({
        message: "Perfil no encontrado",
        kyc: null
      });
    }

    if (!canAccessUserKyc(req, profile.objectId)) {
      return res.status(403).json({ message: "No autorizado" });
    }

    const kycDoc = await IdentifyKYC.findOne({ userId: profile.objectId });
    if (!kycDoc) {
      return res.status(404).json({
        message: "KYC no encontrado para este usuario",
        kyc: null
      });
    }

    const kyc = await mapKycResponse(kycDoc);
    return res.status(200).json({ kyc });
  } catch (error) {
    return res.status(500).json({
      message: "Error al obtener el KYC",
      detalle: error.message
    });
  }
};

// ==========================================
// READ: Obtener el KYC del usuario autenticado (legacy)
// ==========================================
export const getKYC = async (req, res) => {
  try {
    const actor = getAuthActor(req);
    if (!actor) {
      return res.status(401).json({ message: "No autorizado" });
    }

    // Compat: /getKYC/:id → id = userId. Si no viene, usa el actor autenticado.
    const userId = req.params.id || actor._id;

    if (!canAccessUserKyc(req, userId)) {
      return res.status(403).json({ message: "No autorizado" });
    }

    const kycDoc = await IdentifyKYC.findOne({ userId });
    if (!kycDoc) {
      return res.status(404).json({
        error: "Perfil KYC no encontrado.",
        message: "KYC no encontrado para este usuario",
        kyc: null
      });
    }

    const kyc = await mapKycResponse(kycDoc);
    res.json({ data: kycDoc, kyc });
  } catch (error) {
    res.status(500).json({ error: "Error al obtener los datos." });
  }
};

// ==========================================
// READ: Obtener todos los KYC
// ==========================================
export const getAllKYC = async (req, res) => {
  try {
    const actor = getAuthActor(req);
    if (!isAdminActor(actor)) {
      return res.status(403).json({ message: "No autorizado" });
    }

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

    const data = await Promise.all(kycs.map((item) => mapKycResponse(item)));

    res.status(200).json({
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
      data
    });
  } catch (error) {
    res.status(500).json({
      error: "Error al obtener los datos.",
      detalle: error.message
    });
  }
};

// ==========================================
// UPDATE: Actualizar KYC por kycId (dueño o admin)
// ==========================================
export const updateKYC = async (req, res) => {
  const kycId = req.params.kycId || req.params.id;
  const {
    fullName,
    age,
    nationality,
    phone,
    email,
    documentType,
    documentNumber,
    documentImage
  } = req.body;

  try {
    if (!mongoose.Types.ObjectId.isValid(kycId)) {
      return res.status(400).json({ message: "kycId inválido" });
    }

    const existing = await IdentifyKYC.findById(kycId);
    if (!existing) {
      return res.status(404).json({
        error: "KYC no encontrado.",
        message: "KYC no encontrado."
      });
    }

    if (!canAccessUserKyc(req, existing.userId)) {
      return res.status(403).json({ message: "No autorizado" });
    }

    const normalizedImages = normalizeDocumentImage(documentImage);
    const payload = {
      fullName,
      age,
      nationality,
      phone,
      email,
      documentType,
      documentNumber
    };

    const updates = {};
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined) updates[key] = value;
    });
    if (normalizedImages !== undefined && documentImage !== undefined) {
      updates.documentImage = normalizedImages;
    }

    const shouldReopenReview =
      imagesChanged(existing.documentImage, updates.documentImage) ||
      identityChanged(existing, updates);

    if (shouldReopenReview) {
      updates.verify = false;
      updates.status = "pending";
    }

    const kycDoc = await IdentifyKYC.findByIdAndUpdate(kycId, updates, {
      new: true,
      runValidators: true
    });

    if (shouldReopenReview) {
      await Profile.findOneAndUpdate(
        { objectId: kycDoc.userId },
        { isVerify: false }
      );
    }

    const kyc = await mapKycResponse(kycDoc);
    res.status(200).json({
      message: "KYC actualizado correctamente",
      data: kycDoc,
      kyc
    });
  } catch (error) {
    res.status(500).json({
      error: "Error al actualizar el KYC.",
      message: "Error al actualizar el KYC.",
      detalle: error.message
    });
  }
};


