import SocketManager from "../sockets/SocketManager.js";
import NotificationService from "../services/notificationService.js";

const notificationService = new NotificationService(SocketManager.getInstance());

export const notifyAdmin = async ({ type, title, message, targetId = null, meta = null }) => {
  try {
    await notificationService.createAdminNotification({
      type,
      title,
      message,
      targetId,
      meta
    });
  } catch (error) {
    console.error("Error creating notification:", error);
  }
};

export const notifyProfile = async ({
  recipientProfileId,
  type,
  title,
  message,
  targetId = null,
  meta = null
}) => {
  try {
    await notificationService.createProfileNotification({
      recipientProfileId,
      type,
      title,
      message,
      targetId,
      meta
    });
  } catch (error) {
    console.error("Error creating profile notification:", error);
  }
};
