import dotenv from "dotenv";
dotenv.config();

import sendEmail from "../src/utils/sendEmail.js";
import { registrationConfirmationTemplate } from "../src/utils/emailTemplates.js";

const to = process.argv[2] || process.env.TEST_EMAIL;

if (!process.env.RESEND_API_KEY) {
  console.error("❌ Falta RESEND_API_KEY en el archivo .env");
  process.exit(1);
}

if (!to) {
  console.error(
    "❌ Indica un destinatario:\n" +
      "   npm run test:email -- tu@email.com\n" +
      "   o configura TEST_EMAIL en .env"
  );
  process.exit(1);
}

const planArg = process.argv[3] || "3";
const template = registrationConfirmationTemplate({
  name: "Usuario de Prueba",
  email: to,
  role: "anunciante",
  plan: [String(planArg)]
});

console.log("📧 Enviando correo de prueba con Resend...");
console.log(`   From: ${process.env.EMAIL_FROM || "Flammes Rouges <onboarding@resend.dev>"}`);
console.log(`   To:   ${to}`);
console.log(`   Plan: ["${planArg}"]`);
console.log(`   WEB_URL: ${process.env.WEB_URL || "(fallback https://flammesrouges.com/)"}`);

const result = await sendEmail({
  to,
  subject: `${template.subject}`,
  html: template.html,
  text: template.text
});

if (result.skipped) {
  console.error("❌ Envío omitido. Revisa RESEND_API_KEY.");
  process.exit(1);
}

if (result.error) {
  console.error("❌ Error de Resend:", result.error);
  process.exit(1);
}

console.log("✅ Correo enviado correctamente");
console.log("   id:", result.data?.id);
process.exit(0);
