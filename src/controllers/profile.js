
import Profile from "../models/profile.js";
import Client from "../models/Client.js";

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
    city,
    availabity,
    gender,
    age,
    nationality,
    height,
    weight,
    haircolor,
    eyecolor,
    language,
    isPremium,
    imagesMain, 
    imagesGallery 
    } = req.body;

  try {


    // Crear perfil asociado
    const profile = await Profile.create({
      objectId,
      displayName,
      bio,
      phone,
      city,
      availabity,
      gender,
      age,
      nationality,
      height,
      weight,
      haircolor,
      eyecolor,
      language,
      isPremium,
      imagesMain, 
      imagesGallery 
    });

    res.status(201).json({
      profile: {
        _id: profile.objectId,
        displayName: profile.displayName
      },
      profile
    });
  } catch (error) {
    res.status(500).json({ message: "Error en el servidor", error: error.message });
  }
};


// Buscar profile por ID
export const getProfileByID = async (req, res) => {
  const { id } = req.params;
  try {
    const profile = await Profile.findById(id);
    if (!profile) return res.status(404).json({ message: "Perfil no encontrado" });
    res.status(200).json({
      _id: profile.objectId,
      displayName: profile.displayName,
      bio: profile.bio,
      phone: profile.phone,
      city: profile.city,
      availabity: profile.availabity,
      gender: profile.gender,
      age: profile.age,
      nationality: profile.nationality,
      height: profile.height,
      weight: profile.weight,
      haircolor: profile.haircolor,
      eyecolor: profile.eyecolor,
      language: profile.language,
      isPremium: profile.isPremium,
      imagesGallery: profile.imagesGallery,
      imagesMain: profile.imagesMain
    });
  } catch (error) {
    console.log("Error en getProfileByID:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// Buscar todos los profiles
export const getAllProfiles = async (req, res) => {
  try {
    const profiles = await Profile.find();
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
    availabity,
    gender,
    age,
    nationality,
    height,
    weight,
    haircolor,
    eyecolor,
    language,
    isPremium,
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
        availabity,
        gender,
        age,
        nationality,
        height,
        weight,
        haircolor,
        eyecolor,
        language,
        isPremium,
        imagesMain,
        imagesGallery,
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
