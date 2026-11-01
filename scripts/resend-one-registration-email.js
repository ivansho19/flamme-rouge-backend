/**
 * Reenvía el correo de confirmación a un User o Client por email.
 *
 * Uso:
 *   node scripts/resend-one-registration-email.js ivanmanrique1993@gmail.com
 *   npm run email:resend -- ivanmanrique1993@gmail.com
 */

import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import User from "../src/models/User.js";
import Client from "../src/models/Client.js";
import Profile from "../src/models/profile.js";
import sendRegistrationEmail from "../src/utils/sendRegistrationEmail.js";

const email = (process.argv[2] || "").trim().toLowerCase();

if (!email) {
  console.error("❌ Uso: npm run email:resend -- correo@ejemplo.com");
  process.exit(1);
}

if (!process.env.MONGO_URI) {
  console.error("❌ Falta MONGO_URI");
  process.exit(1);
}

if (!process.env.RESEND_API_KEY) {
  console.error("❌ Falta RESEND_API_KEY");
  process.exit(1);
}

await mongoose.connect(process.env.MONGO_URI);
console.log("✅ MongoDB conectado");
console.log(`🔎 Buscando: ${email}`);

const user = await User.findOne({ email: new RegExp(`^${email}$`, "i") });
const client = await Client.findOne({ email: new RegExp(`^${email}$`, "i") });

if (!user && !client) {
  console.error("❌ No existe User ni Client con ese email en esta BD");
  await mongoose.disconnect();
  process.exit(1);
}

let payload;

if (client) {
  const fullName = `${client.name || ""} ${client.lastName || ""}`.trim();
  payload = {
    name: fullName || client.email,
    email: client.email,
    role: "cliente",
    plan: null
  };
  console.log(`✅ Encontrado CLIENT: ${payload.name} (${client._id})`);
} else {
  const profile = await Profile.findOne({ objectId: user._id }).lean();
  const fullName = `${user.name || ""} ${user.lastName || ""}`.trim();
  payload = {
    name: profile?.displayName || fullName || user.email,
    email: profile?.email || user.email,
    role: "anunciante",
    plan: profile?.plan || user.plan || null
  };
  console.log(`✅ Encontrado USER/anunciante: ${payload.name} (${user._id})`);
  console.log(`   Plan: ${JSON.stringify(payload.plan)}`);
}

console.log(`📧 From: ${process.env.EMAIL_FROM || "(fallback)"}`);
console.log(`📧 To:   ${payload.email}`);

const result = await sendRegistrationEmail(payload);

await mongoose.disconnect();

if (result.skipped) {
  console.error("❌ Envío omitido (revisa RESEND_API_KEY)");
  process.exit(1);
}

if (result.error) {
  console.error("❌ Error Resend:", result.error);
  process.exit(1);
}

console.log("✅ Correo reenviado. id:", result.data?.id);
process.exit(0);
