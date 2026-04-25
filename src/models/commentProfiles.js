import mongoose from "mongoose";

const commentProfilesSchema = new mongoose.Schema({
  targetUserId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Client', // El perfil que recibe el comentario
    required: true,
    index: true 
  },
  authorId: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true 
  },
  rating: { 
    type: Number, 
    required: false // Opcional, por si solo quieren dejar texto
  },
  text: { 
    type: String, 
    required: true,
    maxlength: 250 
  },
  // Opcional: Si quieres que el vendedor pueda responder a la reseña
  providerReply: {
    type: String,
    default: null
  }
}, { timestamps: true });

// Índice compuesto para buscar rápidamente las reseñas de un perfil ordenadas por fecha
commentProfilesSchema.index({ targetUserId: 1, createdAt: -1 });

export default mongoose.model("commentProfiles", commentProfilesSchema);