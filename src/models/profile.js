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

  city: {
    type: String
  },

  availability: {
    type: [String]
  },

  gender: {
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
    type: Number,
    default: 0
  },

  imagesMain: {
    type: ImageSchema,
    required: false
  },

  imagesGallery: {
    type: [ImageSchema],
    default: []
  }

}, {
  timestamps: true
});

export default mongoose.model("Profile", ProfileSchema);