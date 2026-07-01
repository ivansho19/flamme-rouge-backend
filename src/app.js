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
import { postRateLimiter } from "./middlewares/rateLimiter.js";

const app = express();

// Confía en el primer proxy (ej: Vercel, Heroku, Nginx, Ngrok, Cloudflare)
// Esto soluciona el error de "X-Forwarded-For" de express-rate-limit
app.set("trust proxy", 1);

app.use(cors({
  origin: '*'
}));
app.use(express.json());

// Aplicar el limitador SOLO a las peticiones POST de forma global
app.use((req, res, next) => {
  if (req.method === 'POST') {
    return postRateLimiter(req, res, next);
  }
  next();
});

// Aplicar el limitador a todas las rutas de la API
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
