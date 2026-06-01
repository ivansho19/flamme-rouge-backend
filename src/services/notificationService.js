import Notification from "../models/Notification.js";
import Profile from "../models/profile.js";

/** @typedef {import("../interfaces/types.js").NotificationPayload} NotificationPayload */

class NotificationService {
  constructor(socketManager) {
    this.socketManager = socketManager;
  }

  async createAdminNotification({ type, title, message, targetId = null, meta = null }) {
    const notification = await Notification.create({
      type,
      title,
      message,
      targetId,
      meta
    });

    return notification;
  }

  async createProfileNotification({
    recipientProfileId,
    type,
    title,
    message,
    targetId = null,
    meta = null
  }) {
    const notification = await Notification.create({
      recipientProfileId,
      type,
      title,
      message,
      targetId,
      meta
    });

    await this.emitToProfileRecipient(notification);
    return notification;
  }

  async emitToProfileRecipient(notification) {
    if (!notification?.recipientProfileId) {
      return;
    }

    const profile = await Profile.findById(notification.recipientProfileId)
      .select("objectId")
      .lean();

    if (!profile?.objectId) {
      return;
    }

    const payload = this.toPayload(notification);
    this.socketManager.emitToUser(profile.objectId.toString(), "notification:new", payload);
  }

  /**
   * @param {import("mongoose").Document} notification
   * @returns {NotificationPayload}
   */
  toPayload(notification) {
    const doc = typeof notification.toObject === "function"
      ? notification.toObject()
      : notification;

    return {
      id: doc._id.toString(),
      type: doc.type,
      title: doc.title,
      message: doc.message,
      targetId: doc.targetId ? doc.targetId.toString() : null,
      recipientProfileId: doc.recipientProfileId ? doc.recipientProfileId.toString() : null,
      status: doc.status,
      meta: doc.meta ?? null,
      createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt)
    };
  }
}

export default NotificationService;
