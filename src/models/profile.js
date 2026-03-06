import mongoose from "mongoose";

const profileSchema = new mongoose.Schema(
  { 
    objectId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Client" },
    displayName: { type: String, required: true },
    bio: { type: String, required: false },
    phone: { type: Number, required: false },
    city: { type: String, required: false },
    availabity: { type: [String], required: false },
    gender: { type: String, required: false },
    age: { type: Number, required: false },
    nationality: { type: String, required: false },
    height: { type: Number, required: false },
    weight: { type: Number, required: false },
    haircolor: { type: String, required: false },
    eyecolor: { type: String, required: false },
    language: { type: [String], required: false },
    isPremium: { type: Boolean, default: false },
    imagesMain: { type: String, required: false },
    imagesGallery: { type: [String], required: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export default mongoose.model("Profile", profileSchema);