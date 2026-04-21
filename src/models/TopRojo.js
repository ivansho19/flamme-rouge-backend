// models/TopRojo.js
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

const TopRojoSchema = new mongoose.Schema({
  // Referencias
  profileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Profile",
    required: true
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  // Datos específicos del TOP ROJO (NO datos del profile)
  title: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 100
  },

  description: {
    type: String,
    required: true,
    minlength: 10,
    maxlength: 1000
  },

  contactPhone: {
    type: String,
    required: true
  },

  // Ubicación específica del TOP ROJO
  city: {
    type: String,
    required: true
  },

  country: {
    type: String,
    required: true
  },

  // Imágenes específicas del TOP ROJO
  images: {
    type: [ImageSchema],
    required: true,
    validate: {
      validator: function(v) {
        return v.length >= 2; // Mínimo 2 imágenes
      },
      message: "Debe tener al menos 2 imágenes"
    }
  },

  // Plan y estadísticas
  planType: {
    type: String,
    enum: ["top_24h", "top_3d", "top_7d"],
    required: true
  },

  startDate: {
    type: Date,
    default: Date.now
  },

  endDate: {
    type: Date,
    required: true
  },

  // Estadísticas
  viewCount: {
    type: Number,
    default: 0
  },

  clickCount: {
    type: Number,
    default: 0
  },

  position: {
    type: Number,
    default: 0
  },

  // Estado
  status: {
    type: String,
    enum: ["active", "expired", "cancelled"],
    default: "active"
  }

}, {
  timestamps: true
});

export default mongoose.model("TopRojo", TopRojoSchema);