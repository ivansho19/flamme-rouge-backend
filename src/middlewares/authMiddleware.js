import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Client from "../models/Client.js";

const protect = async (req, res, next) => {
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

      return res.status(401).json({ message: "No autorizado" });
    } catch (error) {
      return res.status(401).json({ message: "No autorizado" });
    }
  }

  if (!token) {
    return res.status(401).json({ message: "No autorizado, no hay token" });
  }
};

export default protect;