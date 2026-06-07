import express from "express";
import rateLimit from "express-rate-limit";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import paymentRoutes from './routes/paymentRoutes.js';
import paypalRoutes from "./routes/paypal.routes.js";
import profilesRoutes from "./routes/profilesRoutes.js";
import topRojoRoutes from "./routes/topRojoRoutes.js";
import commentsRoutes from "./routes/commentsRoutes.js";
import commentPlanRoutes from "./routes/commentPlanRoutes.js";
import ratingRoutes from "./routes/ratingRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

// Configuración del límite global
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // Ventana de tiempo: 15 minutos
  max: 100, // Máximo 100 peticiones por IP dentro de esos 15 minutos
  message: {
    status: 429,
    message: 'Demasiadas solicitudes desde esta IP, por favor intenta más tarde.'
  },
  standardHeaders: true, // Devuelve la información de límite en los headers 'RateLimit-*'
  legacyHeaders: false, // Desactiva los headers antiguos 'X-RateLimit-*'
});

const app = express();

app.use(cors({
  origin: '*'
}));
app.use(express.json());

// Aplicar el limitador a todas las rutas de la API
app.use('/api/', globalLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/paypal", paypalRoutes);
app.use("/api/profiles", profilesRoutes);
app.use("/api/top-rojo", topRojoRoutes);
app.use("/api/comments", commentsRoutes);
app.use("/api/comment-plans", commentPlanRoutes);
app.use("/api/ratings", ratingRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);

export default app;
