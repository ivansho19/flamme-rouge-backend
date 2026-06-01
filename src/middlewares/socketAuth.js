import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Client from "../models/Client.js";

/** @typedef {import("../interfaces/types.js").JwtPayload} JwtPayload */
/** @typedef {import("../interfaces/types.js").SocketUser} SocketUser */

const resolveToken = (socket) => {
  const authHeader = socket.handshake?.headers?.authorization;
  const bearerToken = authHeader && authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  const authToken = socket.handshake?.auth?.token;
  const queryToken = typeof socket.handshake?.query?.token === "string"
    ? socket.handshake.query.token
    : null;

  return authToken || bearerToken || queryToken || null;
};

const resolveSocketUser = async (decoded) => {
  const user = await User.findById(decoded.id).select("-password").lean();
  if (user) {
    return { id: user._id.toString(), role: "user", model: "User" };
  }

  const client = await Client.findById(decoded.id).select("-password").lean();
  if (client) {
    return { id: client._id.toString(), role: "client", model: "Client" };
  }

  return null;
};

/**
 * @param {import("socket.io").Socket} socket
 * @param {(err?: Error) => void} next
 */
const socketAuthMiddleware = async (socket, next) => {
  try {
    const token = resolveToken(socket);
    if (!token) {
      return next(new Error("AUTH_REQUIRED"));
    }

    /** @type {JwtPayload} */
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const socketUser = await resolveSocketUser(decoded);

    if (!socketUser) {
      return next(new Error("INVALID_TOKEN"));
    }

    socket.data.user = socketUser;
    return next();
  } catch (error) {
    return next(new Error("INVALID_TOKEN"));
  }
};

export default socketAuthMiddleware;
