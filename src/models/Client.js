import mongoose from "mongoose";

const clientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    payment: { type: String, required: false },
    country: { type: String, required: true },
    city: { type: String, required: true },
    phone: { type: Number, required: true },
    dateOfBirth: { type: Date, required: false },
    profilePicture: { type: String },
    isAdmin: { type: Boolean, default: false },
    gender: { type: String, required: true }

  },
  { timestamps: true }
);

export default mongoose.model("Client", clientSchema);