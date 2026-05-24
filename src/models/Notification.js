import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId },
    recipientProfileId: { type: mongoose.Schema.Types.ObjectId, ref: "Profile" },
    status: { type: String, enum: ["unread", "read"], default: "unread" },
    meta: { type: mongoose.Schema.Types.Mixed }
  },
  { timestamps: true }
);

export default mongoose.model("Notification", NotificationSchema);
