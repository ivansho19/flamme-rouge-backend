import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isAdmin: { type: Boolean, default: false },
    isActivePlan: { type: Boolean, default: false },
    plan: { type: String, default: false }
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);