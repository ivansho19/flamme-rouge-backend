import sendEmail from "./sendEmail.js";
import { registrationConfirmationTemplate } from "./emailTemplates.js";

/**
 * Envía el correo de confirmación de registro.
 * No lanza error al caller: el registro no debe fallar por el email.
 */
const sendRegistrationEmail = async ({ name, email, role, plan }) => {
  if (!email) {
    console.warn("[sendRegistrationEmail] Sin email; no se envía correo.");
    return { skipped: true, error: null, data: null };
  }

  try {
    const template = registrationConfirmationTemplate({ name, email, role, plan });
    const result = await sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text
    });

    if (result.skipped) {
      console.warn("[sendRegistrationEmail] Envío omitido (¿falta RESEND_API_KEY?).", {
        email,
        role
      });
    } else if (result.error) {
      console.error("[sendRegistrationEmail] Error Resend:", result.error);
    } else {
      console.log("[sendRegistrationEmail] Correo enviado:", {
        email,
        role,
        plan,
        id: result.data?.id
      });
    }

    return result;
  } catch (error) {
    console.error("[sendRegistrationEmail] Error inesperado:", error);
    return { skipped: false, error, data: null };
  }
};

export default sendRegistrationEmail;
