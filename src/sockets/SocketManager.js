import { Server } from "socket.io";
import socketAuthMiddleware from "../middlewares/socketAuth.js";

/** @typedef {import("../interfaces/types.js").NotificationPayload} NotificationPayload */

class SocketManager {
  static #instance;

  constructor() {
    this.io = null;
  }

  static getInstance() {
    if (!SocketManager.#instance) {
      SocketManager.#instance = new SocketManager();
    }

    return SocketManager.#instance;
  }

  initialize(httpServer, options = {}) {
    if (this.io) {
      return this.io;
    }

    this.io = new Server(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      },
      connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000
      },
      ...options
    });

    this.io.use(socketAuthMiddleware);

    this.io.on("connection", (socket) => {
      const user = socket.data?.user;
      if (!user?.id) {
        socket.disconnect(true);
        return;
      }

      const room = `user-${user.id}`;
      socket.join(room);

      socket.on("disconnect", () => {
        // Keep this hook for future online/offline tracking.
      });

      socket.on("error", () => {
        // Centralized error hook for socket-level errors.
      });
    });

    return this.io;
  }

  /**
   * @param {string} userId
   * @param {string} event
   * @param {NotificationPayload} payload
   */
  emitToUser(userId, event, payload) {
    if (!this.io) {
      console.warn("SocketManager not initialized. Skipping emit.");
      return;
    }

    this.io.to(`user-${userId}`).emit(event, payload);
  }
}

export default SocketManager;
