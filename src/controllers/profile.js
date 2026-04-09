
import mongoose from "mongoose";
import Profile from "../models/profile.js";
import IdentifyKYC from "../models/identifyKYC.js";

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
    imagesMain,
    imagesGallery,
    posibilities
  } = req.body;

  try {
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
      plan,
      imagesMain,
      imagesGallery,
      posibilities
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
  imagesGallery: profile.imagesGallery,
  imagesMain: profile.imagesMain,
  birthDate: profile.birthDate,
  posibilities: profile.posibilities,
  zone: profile.zone,
  orientation: profile.orientation
});

// Buscar profile por ID
export const getProfileByID = async (req, res) => {
  const { id } = req.params;
  try {
    const profile = await Profile.findById(id);
    if (!profile) return res.status(404).json({ message: "Perfil no encontrado" });
    res.status(200).json(mapProfileResponse(profile));
  } catch (error) {
    console.log("Error en getProfileByID:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// GET /getProfileByUser/:userId
export const getProfileByUserId = async (req, res) => {
  const { userId } = req.params;
  try {
    const profile = await Profile.findOne({ objectId: userId });
    if (!profile) return res.status(404).json({ message: "Perfil no encontrado" });
    res.status(200).json(mapProfileResponse(profile));
  } catch (error) {
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// Buscar todos los profiles
export const getAllProfiles = async (req, res) => {
  try {
    const profiles = await Profile.find().sort({ plan: -1});
    res.status(200).json(profiles);
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
    posibilities,
    imagesMain,
    imagesGallery
  } = req.body;

  const { id } = req.params; // El id del perfil a actualizar

  try {
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
        birthDate,
        imagesMain,
        imagesGallery,
        posibilities,
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

    const profiles = await Profile.find({ $or: orClauses });

    res.status(200).json(profiles);
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
    documentId
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
      documentId
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
    documentId
  } = req.body;

  try {
    const kyc = await IdentifyKYC.findByIdAndUpdate(kycId, { fullName, age, nationality, phone, email, documentId }, { new: true });
    if (!kyc) return res.status(404).json({ error: 'KYC no encontrado.' });

    res.json({ message: 'KYC actualizado exitosamente.', data: kyc });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar el KYC.', detalle: error.message });
  }
};


// ==========================================
// ADMIN: Verificar identidad
// ==========================================
export const verifyKYC = async (req, res) => {
  try {
    const { kycId } = req.params; 
    const { verify } = req.body; 

    const kyc = await IdentifyKYC.findByIdAndUpdate(kycId, { verify }, { new: true });
    if (!kyc) return res.status(404).json({ error: 'KYC no encontrado.' });

    res.json({ message: `KYC ${verify ? 'aprobado' : 'rechazado'}.`, data: kyc });
  } catch (error) {
    res.status(500).json({ error: 'Error al cambiar estado.' });
  }
};