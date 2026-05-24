import mongoose from "mongoose";
import Notification from "../models/Notification.js";
import Profile from "../models/profile.js";

export const getNotifications = async (req, res) => {
  try {
    const { status } = req.query;

    const filter = {};
    if (status === "read" || status === "unread") {
      filter.status = status;
    }

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      total: notifications.length,
      data: notifications
    });
  } catch (error) {
    res.status(500).json({ message: "Error obteniendo notificaciones", error: error.message });
  }
};

export const markNotificationsRead = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "ids es obligatorio" });
    }

    const result = await Notification.updateMany(
      { _id: { $in: ids } },
      { $set: { status: "read" } }
    );

    res.status(200).json({ modifiedCount: result.modifiedCount });
  } catch (error) {
    res.status(500).json({ message: "Error actualizando notificaciones", error: error.message });
  }
};

export const markAllNotificationsRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { status: "unread" },
      { $set: { status: "read" } }
    );

    res.status(200).json({ modifiedCount: result.modifiedCount });
  } catch (error) {
    res.status(500).json({ message: "Error actualizando notificaciones", error: error.message });
  }
};

export const getProfileNotifications = async (req, res) => {
  try {
    const { profileId } = req.params;
    const { status } = req.query;

    if (!mongoose.Types.ObjectId.isValid(profileId)) {
      return res.status(400).json({ message: "ID de perfil invalido" });
    }

    const profile = await Profile.findById(profileId);
    if (!profile) {
      return res.status(404).json({ message: "Perfil no encontrado" });
    }

    const requesterId = req.user?._id || req.client?._id;
    if (!requesterId || !profile.objectId.equals(requesterId)) {
      return res.status(403).json({ message: "No autorizado" });
    }

    const filter = { recipientProfileId: profileId };
    if (status === "read" || status === "unread") {
      filter.status = status;
    }

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      total: notifications.length,
      data: notifications
    });
  } catch (error) {
    res.status(500).json({ message: "Error obteniendo notificaciones", error: error.message });
  }
};
