import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Resend } from "resend";
import { LOGO_CONTENT_ID } from "./emailTemplates.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOGO_PATH = path.join(__dirname, "../assets/email/logo.png");

let cachedLogoBase64 = null;

const getLogoAttachment = () => {
  if (!cachedLogoBase64) {
    if (!fs.existsSync(LOGO_PATH)) {
      console.warn("[sendEmail] Logo no encontrado en:", LOGO_PATH);
      return null;
    }
    cachedLogoBase64 = fs.readFileSync(LOGO_PATH).toString("base64");
  }

  return {
    content: cachedLogoBase64,
    filename: "logo.png",
    contentId: LOGO_CONTENT_ID
  };
};

/**
 * Envía un correo con Resend.
 * @see https://resend.com/docs/send-with-nodejs
 */
const sendEmail = async ({ to, subject, html, text, attachments = [] }) => {
  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.EMAIL_FROM ||
    process.env.SMTP_FROM ||
    "Flamme Rouge <onboarding@resend.dev>";

  if (!apiKey) {
    console.warn("[sendEmail] RESEND_API_KEY no configurada. Email no enviado.", {
      to,
      subject
    });
    return { skipped: true, error: null, data: null };
  }

  const resend = new Resend(apiKey);
  const logoAttachment = getLogoAttachment();
  const finalAttachments = [
    ...(logoAttachment ? [logoAttachment] : []),
    ...attachments
  ];

  const { data, error } = await resend.emails.send({
    from,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    text,
    attachments: finalAttachments.length ? finalAttachments : undefined
  });

  if (error) {
    console.error("[sendEmail] Error Resend:", error);
    return { skipped: false, error, data: null };
  }

  return { skipped: false, error: null, data };
};

export default sendEmail;
