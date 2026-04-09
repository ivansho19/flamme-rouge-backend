import mongoose from "mongoose";

const ImageSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true
  },
  public_id: {
    type: String,
    required: true
  }
});

const ProfileSchema = new mongoose.Schema({

  objectId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Client"
  },

  displayName: {
    type: String,
    required: true
  },

  bio: {
    type: String
  },

  phone: {
    type: String
  },

  country: {
    type: String
  },

  city: {
    type: String
  },

  zone: {
    type: String
  },

  birthDate: {
    type: Date
  },

  availability: {
    type: [String]
  },

  gender: {
    type: String
  },

  orientation: {
    type: String
  },

  age: {
    type: Number
  },

  nationality: {
    type: String
  },

  height: {
    type: Number
  },

  weight: {
    type: Number
  },

  hairColor: {
    type: String
  },

  eyeColor: {
    type: String
  },

  languages: {
    type: [String]
  },

  plan: {
    type: [String],
    default: []
  },

  imagesMain: {
    type: ImageSchema,
    required: false
  },

  imagesGallery: {
    type: [ImageSchema],
    default: []
  },
   posibilities: {
    type: [String],
    required: false
  },

}, {
  timestamps: true
});

export default mongoose.model("Profile", ProfileSchema);