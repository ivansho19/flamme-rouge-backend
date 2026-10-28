import crypto from "crypto";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Client from "../models/Client.js";
import generateToken from "../utils/generateToken.js";
import sendEmail from "../utils/sendEmail.js";
import sendRegistrationEmail from "../utils/sendRegistrationEmail.js";
import { passwordResetTemplate } from "../utils/emailTemplates.js";
import Profile from "../models/profile.js"; // Ajusta la ruta según tu estructura
import verifyTurnstileToken from "../middlewares/verifyTurnstileMiddleware.js";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora
const MIN_PASSWORD_LENGTH = 8;

const hashResetToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const findAccountByEmail = async (email) => {
  const user = await User.findOne({ email });
  if (user) return { account: user, model: User };

  const client = await Client.findOne({ email });
  if (client) return { account: client, model: Client };

  return null;
};

const findAccountByResetToken = async (hashedToken) => {
  const query = {
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() }
  };

  const user = await User.findOne(query);
  if (user) return user;

  return Client.findOne(query);
};

const parserId = (id) => {
  return mongoose.Types.ObjectId(id);
};

// Registro de usuario (anunciante)
export const registerUser = async (req, res) => {
  const { name, lastName, email, password, plan, cfTurnstileToken } = req.body;

  try {
    // 1. Validar Cloudflare Turnstile
    const isTokenValid = await verifyTurnstileToken(cfTurnstileToken);
    if (!isTokenValid) {
      return res.status(400).json({ message: "Verificación de seguridad fallida. Por favor, intenta de nuevo." });
    }

    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: "Usuario ya existe" });

    const hashedPassword = await bcrypt.hash(password, 10);

    // El frontend puede enviar string o array (ej. ["1"], "premium")
    const normalizedPlan = Array.isArray(plan)
      ? plan.filter(Boolean).join(", ")
      : plan;

    const user = await User.create({
      name,
      lastName,
      email,
      password: hashedPassword,
      ...(normalizedPlan != null && normalizedPlan !== ""
        ? { plan: normalizedPlan }
        : {})
    });

    const fullName = `${user.name} ${user.lastName}`.trim();

    // El correo de bienvenida del anunciante se envía al crear el perfil
    // (ahí llega el plan definitivo: ["1"] | ["2"] | ["3"] | ["free"]).

    res.status(201).json({
      _id: user.id,
      name: fullName,
      email: user.email,
      plan: user.plan,
      token: generateToken(user._id)
    });
  } catch (error) {
    console.error("Error en registerUser:", error);
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
  const { name, lastName, email, password, cfTurnstileToken 
  } = req.body;
  try {
    // 1. Validar Cloudflare Turnstile
    const isTokenValid = await verifyTurnstileToken(cfTurnstileToken);
    if (!isTokenValid) {
      return res.status(400).json({ message: "Verificación de seguridad fallida. Por favor, intenta de nuevo." });
    }

    const clientExists = await Client.findOne({ email });
    if (clientExists) return res.status(400).json({ message: "Cliente ya existe" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const client = await Client.create({
      name,
      lastName,
      email,
      password: hashedPassword
    });

    const fullName = `${client.name} ${client.lastName}`.trim();

    await sendRegistrationEmail({
      name: fullName,
      email: client.email,
      role: "cliente"
    });

    res.status(201).json({
      _id: client.id,
      name: fullName,
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
  const { email, password, cfTurnstileToken } = req.body;

  try {
    // 1. Validar Cloudflare Turnstile
    const isTokenValid = await verifyTurnstileToken(cfTurnstileToken);
    if (!isTokenValid) {
      return res.status(400).json({ message: "Verificación de seguridad fallida. Por favor, intenta de nuevo." });
    }

    const user = await User.findOne({ email });
    const clients = await Client.findOne({ email });
    if (!user && !clients) return res.status(400).json({ message: "Credenciales inválidas" });

    const matchUser = user ? await bcrypt.compare(password, user.password) : false;
    const matchClients = clients ? await bcrypt.compare(password, clients.password) : false;
    if (!matchUser && !matchClients) return res.status(400).json({ message: "Credenciales inválidas" });

    let responseUser = null;
    
    if (matchUser && user) {
      // Buscar el profile asociado a este user
      const profile = await Profile.findOne({ objectId: user._id });
      
      responseUser = {
        _id: user._id,
        name: user.name,
        email: user.email,
        user: true,
        isAdmin: user.isAdmin || false,
        client: false,
        profileId: profile?._id || null,
        token: generateToken(user._id)
      };
    } else if (matchClients && clients) {
      // Buscar el profile asociado a este client
      const profile = await Profile.findOne({ objectId: clients._id });
      
      responseUser = {
        _id: clients._id,
        name: clients.name,
        email: clients.email,
        client: true,
        isAdmin: clients.isAdmin || false,
        profileId: profile?._id || null,
        token: generateToken(clients._id)
      };
    }
    
    if (!responseUser) return res.status(400).json({ message: "Credenciales inválidas" });
    res.json(responseUser);
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// Solicitar recuperación de contraseña
export const forgotPassword = async (req, res) => {
  const { email, cfTurnstileToken } = req.body;
  const genericMessage =
    "Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.";

  try {
    if (!email) {
      return res.status(400).json({ message: "El email es obligatorio" });
    }

    if (cfTurnstileToken) {
      const isTokenValid = await verifyTurnstileToken(cfTurnstileToken);
      if (!isTokenValid) {
        return res.status(400).json({
          message: "Verificación de seguridad fallida. Por favor, intenta de nuevo."
        });
      }
    }

    const found = await findAccountByEmail(String(email).trim());

    // Respuesta genérica para no revelar si el email existe
    if (!found) {
      return res.status(200).json({ message: genericMessage });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = hashResetToken(rawToken);

    found.account.resetPasswordToken = hashedToken;
    found.account.resetPasswordExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await found.account.save();

    const frontendUrl = process.env.WEB_URL;
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;
    const fullName = `${found.account.name || ""} ${found.account.lastName || ""}`.trim();
    const resetTemplate = passwordResetTemplate({
      name: fullName || found.account.email,
      resetUrl
    });

    await sendEmail({
      to: found.account.email,
      subject: resetTemplate.subject,
      text: resetTemplate.text,
      html: resetTemplate.html
    });

    const payload = { message: genericMessage };

    // Solo en desarrollo, facilita probar sin SMTP
    if (process.env.NODE_ENV !== "production") {
      payload.resetUrl = resetUrl;
    }

    return res.status(200).json(payload);
  } catch (error) {
    console.error("Error en forgotPassword:", error);
    return res.status(500).json({ message: "Error en el servidor" });
  }
};

// Restablecer contraseña con token
export const resetPassword = async (req, res) => {
  const { token, password, cfTurnstileToken } = req.body;

  try {
    if (!token || !password) {
      return res.status(400).json({
        message: "Token y nueva contraseña son obligatorios"
      });
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        message: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`
      });
    }

    if (cfTurnstileToken) {
      const isTokenValid = await verifyTurnstileToken(cfTurnstileToken);
      if (!isTokenValid) {
        return res.status(400).json({
          message: "Verificación de seguridad fallida. Por favor, intenta de nuevo."
        });
      }
    }

    const hashedToken = hashResetToken(token);
    const account = await findAccountByResetToken(hashedToken);

    if (!account) {
      return res.status(400).json({
        message: "Token inválido o expirado"
      });
    }

    account.password = await bcrypt.hash(password, 10);
    account.resetPasswordToken = undefined;
    account.resetPasswordExpires = undefined;
    await account.save();

    return res.status(200).json({
      message: "Contraseña actualizada correctamente"
    });
  } catch (error) {
    console.error("Error en resetPassword:", error);
    return res.status(500).json({ message: "Error en el servidor" });
  }
};