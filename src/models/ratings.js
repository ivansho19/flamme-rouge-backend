import mongoose from "mongoose";

const ratingSchema = new mongoose.Schema({
  profileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Profile",
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  }
}, { timestamps: true });

// Índice compuesto único: garantiza que un usuario solo pueda dar like una vez a un mismo perfil
ratingSchema.index({ profileId: 1, userId: 1 }, { unique: true });

export default mongoose.model("Rating", ratingSchema);