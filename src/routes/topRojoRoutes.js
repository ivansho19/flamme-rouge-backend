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

// POST /api/profiles/top-rojo/create
router.post("/top-rojo/create", createTopRojo);

// GET /api/profiles/top-rojo/all
router.get("/top-rojo/all", getAllTops);

// GET /api/profiles/top-rojo/user/:userId/my-tops
router.get("/top-rojo/user/:userId/my-tops", getMyTops);

// GET /api/profiles/top-rojo/city/:city/:country
router.get("/top-rojo/city/:city/:country", getTopRojoByCity);

// POST /api/profiles/top-rojo/:id/renew
router.post("/top-rojo/:id/renew", renewTopRojo);

// POST /api/profiles/top-rojo/:id/cancel
router.post("/top-rojo/:id/cancel", cancelTopRojo);

export default router;
