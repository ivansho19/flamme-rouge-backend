import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import paymentRoutes from './routes/paymentRoutes.js';
import profilesRoutes from "./routes/profilesRoutes.js";
import topRojoRoutes from "./routes/topRojoRoutes.js";
import commentsRoutes from "./routes/commentsRoutes.js";

const app = express();

app.use(cors({
  origin: '*'
}));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/profiles", profilesRoutes);
app.use("/api/top-rojo", topRojoRoutes);
app.use("/api/comments", commentsRoutes);

export default app;
