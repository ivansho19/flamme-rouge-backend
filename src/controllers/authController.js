import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Client from "../models/Client.js";
import generateToken from "../utils/generateToken.js";

const parserId = (id) => {
  return mongoose.Types.ObjectId(id);
};

// Registro de usuario
export const registerUser = async (req, res) => {
  const { name, lastName, email, password } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: "Usuario ya existe" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      lastName,
      email,
      password: hashedPassword
    });

    res.status(201).json({
      _id: user.id,
      name: user.name + " " + user.lastName,
      email: user.email,
      token: generateToken(user._id)
    });
  } catch (error) {
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// Buscar usuario por email
export const getUserByEmail = async (req, res) => {
  const { email } = req.params;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });
    res.status(200).json({
      _id: user.id,
      name: user.name,
      email: user.email,
      // Puedes agregar más campos si es necesario
    });
  } catch (error) {
    console.log("Error en getUserByEmail:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// Eliminar usuario
export const deleteUser = async (req, res) => {
  const { id } = req.params; // Obtener el ID del usuario de los parámetros de la solicitud
  try {
    const user = await User.findByIdAndDelete(id); // Buscar y eliminar al usuario por ID
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });
    
    res.status(200).json({ message: "Usuario eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// Actualizar usuario
export const updateUser = async (req, res) => {
  const { id } = req.params; // Obtener el ID del usuario de los parámetros de la solicitud
  const { name, email, password, ...otherUpdates } = req.body; // Obtener los campos del cuerpo de la solicitud
  
  try {
    // Si se proporciona una nueva contraseña, la hasheamos
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      otherUpdates.password = hashedPassword; // Usar la contraseña hasheada
    }

    const user = await User.findByIdAndUpdate(id, { name, email, ...otherUpdates }, { new: true }); // Actualizar el usuario
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

    res.status(200).json({
      _id: user.id,
      name: user.name,
      email: user.email,
      // Puedes agregar más campos si es necesario
    });
  } catch (error) {
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// Registro de Clientes
export const registerClient = async (req, res) => {
  const { name, lastName, email, password } = req.body;
  try {
    const clientExists = await Client.findOne({ email });
    if (clientExists) return res.status(400).json({ message: "Cliente ya existe" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const client = await Client.create({
      name,
      lastName,
      email,
      password: hashedPassword
    });

    res.status(201).json({
      _id: client.id,
      name: client.name + " " + client.lastName,
      email: client.email,
      token: generateToken(client._id)
    });
  } catch (error) {
    console.log("Error en registerClient:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};


// Buscar cliente por email
export const getClientByEmail = async (req, res) => {
  const { email } = req.params;
  try {
    const client = await Client.findOne({ email });
    if (!client) return res.status(404).json({ message: "Usuario no encontrado" });
    res.status(200).json({
      _id: client.id,
      name: client.name,
      email: client.email,
      country: client.country,
      city: client.city,
      gender: client.gender,
      phone: client.phone
    });
  } catch (error) {
    console.log("Error en getClientByEmail:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// Eliminar cliente
export const deleteClient = async (req, res) => {
  const { id } = req.params; // Obtener el ID del usuario de los parámetros de la solicitud
  try {
    const client = await Client.findByIdAndDelete(id); // Buscar y eliminar al usuario por ID
    if (!client) return res.status(404).json({ message: "Usuario no encontrado" });
    
    res.status(200).json({ message: "Usuario eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// Actualizar cliente
export const updateClient = async (req, res) => {
  const { id } = req.params; // Obtener el ID del usuario de los parámetros de la solicitud
  const { name, email, password, ...otherUpdates } = req.body; // Obtener los campos del cuerpo de la solicitud
  
  try {
    // Si se proporciona una nueva contraseña, la hasheamos
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      otherUpdates.password = hashedPassword; // Usar la contraseña hasheada
    }

    const client = await Client.findByIdAndUpdate(id, { name, email, ...otherUpdates }, { new: true }); // Actualizar el usuario
    if (!client) return res.status(404).json({ message: "Usuario no encontrado" });

    res.status(200).json({
      _id: client.id,
      name: client.name,
      email: client.email,
      // Puedes agregar más campos si es necesario
    });
  } catch (error) {
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// Login
export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    const clients = await Client.findOne({ email });
    if (!user && !clients) return res.status(400).json({ message: "Credenciales inválidas" });

    const matchUser = user ? await bcrypt.compare(password, user.password) : false;
    const matchClients = clients ? await bcrypt.compare(password, clients.password) : false;
    if (!matchUser && !matchClients) return res.status(400).json({ message: "Credenciales inválidas" });

    let responseUser = null;
    if (matchUser && user) {
      responseUser = {
        _id: user.id,
        name: user.name,
        email: user.email,
        user: true,
        token: generateToken(user._id)
      };
    } else if (matchClients && clients) {
      responseUser = {
        _id: clients.id,
        name: clients.name,
        email: clients.email,
        client: true,
        token: generateToken(clients._id)
      };
    }
    if (!responseUser) return res.status(400).json({ message: "Credenciales inválidas" });
    res.json(responseUser);
  } catch (error) {
    res.status(500).json({ message: "Error en el servidor" });
  }
};