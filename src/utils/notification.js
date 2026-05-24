import Notification from "../models/Notification.js";

export const notifyAdmin = async ({ type, title, message, targetId = null, meta = null }) => {
  try {
    await Notification.create({
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
    await Notification.create({
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
