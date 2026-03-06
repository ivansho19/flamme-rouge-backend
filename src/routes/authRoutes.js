import express from "express";
import { registerUser, login, registerClient, 
  deleteUser, updateUser, getUserByEmail, 
  deleteClient, updateClient, getClientByEmail } from "../controllers/authController.js";

const router = express.Router();

router.post("/register", registerUser);
router.delete("/deleteUser/:id", deleteUser);
router.post("/updateUser/:id", updateUser);
// Buscar usuario por email
router.get("/user/:email", getUserByEmail);
router.post("/registerClient", registerClient);
router.delete("/deleteClient/:id", deleteClient);
router.post("/updateClient/:id", updateClient);
// Buscar cliente por email
router.get("/client/:email", getClientByEmail);
router.post("/login", login);


export default router;