import express from "express";
import {
  createTopRojo,
  getMyTops,
  getAllTops,
  getTopRojoByCity,
  renewTopRojo,
  cancelTopRojo
} from "../controllers/topRojoController.js";

const router = express.Router();

// POST /api/top-rojo/create
router.post("/create", createTopRojo);

// GET /api/top-rojo/all
router.get("/all", getAllTops);

// GET /api/top-rojo/user/:userId/my-tops
router.get("/user/:userId/my-tops", getMyTops);

// GET /api/top-rojo/city/:city/:country
router.get("/city/:city/:country", getTopRojoByCity);

// POST /api/top-rojo/:id/renew
router.post("/:id/renew", renewTopRojo);

// POST /api/top-rojo/:id/cancel
router.post("/:id/cancel", cancelTopRojo);

export default router;
