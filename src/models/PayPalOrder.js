import mongoose from "mongoose";

const PayPalOrderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, index: true },
    status: { type: String },
    amount: { type: Number },
    currency: { type: String },
    payerId: { type: String },
    payerEmail: { type: String },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client" },
    profileId: { type: mongoose.Schema.Types.ObjectId, ref: "Profile" },
    rawCreateResponse: { type: Object },
    rawCaptureResponse: { type: Object }
  },
  { timestamps: true }
);

export default mongoose.model("PayPalOrder", PayPalOrderSchema);
