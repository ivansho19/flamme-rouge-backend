import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Client from "../models/Client.js";
import generateToken from "../utils/generateToken.js";

// Registro de usuario
export const registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: "Usuario ya existe" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword
    });

    res.status(201).json({
      _id: user.id,
      name: user.name,
      email: user.email,
      token: generateToken(user._id)
    });
  } catch (error) {
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// Registro de Clientes
export const registerClient = async (req, res) => {
  const { name, email, password, country, city, gender, phone  } = req.body;

  try {
    const clientExists = await Client.findOne({ email });
    if (clientExists) return res.status(400).json({ message: "Cliente ya existe" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const client = await Client.create({
      name,
      email,
      password: hashedPassword,
      country,
      city,
      gender,
      phone
    });

    res.status(201).json({
      _id: client.id,
      name: client.name,
      email: client.email,
      token: generateToken(client._id),
      country: client.country
    });
  } catch (error) {
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// Login de usuario
export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Credenciales inválidas" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Credenciales inválidas" });

    res.json({
      _id: user.id,
      name: user.name,
      email: user.email,
      token: generateToken(user._id)
    });
  } catch (error) {
    res.status(500).json({ message: "Error en el servidor" });
  }
};