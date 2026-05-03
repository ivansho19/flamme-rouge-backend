import mongoose from "mongoose";

const CommentPlanSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    planType: { type: String, enum: ["monthly", "annual"], required: true },
    status: { type: String, enum: ["active", "cancelled", "expired"], default: "active" },
    badge: { type: String },
    startedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true }
  },
  { timestamps: true }
);

export default mongoose.model("CommentPlan", CommentPlanSchema);
