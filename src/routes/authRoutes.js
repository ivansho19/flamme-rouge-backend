import express from "express";
import { registerUser, loginUser, registerClient, 
  deleteUser, updateUser, getUserByEmail, 
  deleteClient, updateClient, getClientByEmail } from "../controllers/authController.js";
import protect from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/deleteUser/:id", deleteUser);
router.post("/updateUser/:id", updateUser);
// Buscar usuario por email
router.get("/user/:email", getUserByEmail);
router.post("/registerClient", registerClient);
router.post("/deleteClient/:id", deleteClient);
router.post("/updateClient/:id", updateClient);
// Buscar cliente por email
router.get("/client/:email", getClientByEmail);
router.post("/login", loginUser);


// Ejemplo de ruta protegida
router.get("/profile", protect, (req, res) => {
  res.json(req.user);
});

export default router;