import express from "express";
import { createOrder, captureOrder } from "../controllers/paypal.controller.js";
import protect from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/create-order", protect, createOrder);
router.post("/capture-order", protect, captureOrder);

export default router;
