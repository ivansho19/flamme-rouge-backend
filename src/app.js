import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import paymentRoutes from './routes/paymentRoutes.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/payment", paymentRoutes);

export default app;
