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

const identifyKYCSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    unique: true 
  },
  fullName: { 
    type: String, 
    required: true,
    trim: true
  },
  age: { 
    type: Number, 
    required: true,
    min: 18 
  },
  nationality: { 
    type: String, 
    required: true 
  },
  phone: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    required: true
  },
  documentImage: {
    type: [ImageSchema],
    required: false,
    default: []
  },
  verify: { 
    type: Boolean, 
    default: false 
  }
}, { timestamps: true });

export default mongoose.model("IdentifyKYC", identifyKYCSchema);