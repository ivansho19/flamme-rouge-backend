import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Client from "../models/Client.js";

const optionalAuth = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const user = await User.findById(decoded.id).select("-password");
      if (user) {
        req.user = user;
        return next();
      }

      const client = await Client.findById(decoded.id).select("-password");
      if (client) {
        req.client = client;
        return next();
      }

      // Token existía pero no se encontró usuario o cliente, continuamos como anónimo
      return next();
    } catch (error) {
      // Error al verificar el token (ej. expirado o inválido), continuamos como anónimo
      return next();
    }
  }

  // Si no hay token, continuamos como anónimo
  return next();
};

export default optionalAuth;
