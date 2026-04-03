import mongoose from "mongoose";

const clientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    nickname: { type: String, required: false, unique: false },
    password: { type: String, required: true },
    payment: { type: String, required: false },
    country: { type: String, required: false },
    city: { type: String, required: false },
    phone: { type: Number, required: false },
    dateOfBirth: { type: Date, required: false },
    profilePicture: { type: String },
    isAdmin: { type: Boolean, default: false },
    gender: { type: String, required: false }

  },
  { timestamps: true }
);

export default mongoose.model("Client", clientSchema);