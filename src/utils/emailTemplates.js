export const LOGO_CONTENT_ID = "flamme-rouge-logo";

const COLORS = {
  primary: "#8C030E",
  accent: "#A60F2B",
  cream: "#F2DBAE",
  creamText: "#F2DAAC",
  gold: "#BF9663",
  brown: "#A68051",
  gray: "#F2F2F2",
  dark: "#1C1C1C",
  nearBlack: "#0D0D0D",
  white: "#FFFFFF",
  headerBg: "#0D0D0D",
  headerText: "#F2DAAC",
  bodyBg: "#F2F2F2",
  cardBg: "#FFFFFF",
  bodyText: "#1C1C1C",
  mutedText: "#A68051",
  ctaBg: "#8C030E",
  ctaText: "#F2DAAC",
  border: "#BF9663",
  footerBg: "#0D0D0D",
  footerText: "#F2DAAC",
  link: "#A60F2B"
};

/** Catálogo de planes: frontend envía plan: ["1"] | ["2"] | ["3"] | ["free"] */
const PLAN_CATALOG = {
  "1": {
    key: "1",
    name: "Plan Básico",
    price: "39€ / mes",
    headerColor: "#8C030E",
    borderColor: "#8C030E",
    badge: null,
    features: [
      { text: "Perfil activo", included: true },
      { text: "Aparece en búsquedas", included: true },
      { text: "Hasta 8 fotos", included: true },
      { text: "Comentarios y rating", included: true },
      { text: "Sin prioridad", included: false }
    ]
  },
  "2": {
    key: "2",
    name: "Plan Pro",
    price: "79€ / mes",
    headerColor: "#8C030E",
    borderColor: "#8C030E",
    badge: "RECOMENDADO",
    features: [
      { text: "Todo lo del Básico", included: true },
      { text: "Mejor posición en ciudad", included: true },
      { text: "Rotaciones destacadas", included: true },
      { text: "Badge Recomendado", included: true },
      { text: "Hasta 15 fotos", included: true }
    ]
  },
  "3": {
    key: "3",
    name: "Plan VIP",
    price: "149€ / mes",
    headerColor: "#BF9663",
    borderColor: "#BF9663",
    badge: "VIP",
    features: [
      { text: "Todo lo del Pro", included: true },
      { text: "Prioridad máxima", included: true },
      { text: "Destacado en Home", included: true },
      { text: "Badge VIP", included: true },
      { text: "Hasta 30 fotos", included: true },
      { text: "Soporte prioritario", included: true }
    ]
  },
  free: {
    key: "free",
    name: "Plan Free",
    price: "0€ / promo",
    headerColor: "#A68051",
    borderColor: "#BF9663",
    badge: "PROMO",
    features: [
      { text: "Perfil activo", included: true },
      { text: "Aparece en búsquedas", included: true },
      { text: "Hasta 8 fotos", included: true },
      { text: "Comentarios y rating", included: true },
      { text: "Acceso promocional gratuito", included: true }
    ]
  }
};

const PLAN_ALIASES = {
  "1": "1",
  basico: "1",
  básico: "1",
  basic: "1",
  "2": "2",
  pro: "2",
  "3": "3",
  vip: "3",
  free: "free",
  gratis: "free",
  promo: "free"
};

const getWebUrl = () =>
  process.env.WEB_URL ||
  process.env.FRONTEND_URL ||
  "https://flammesrouges.com/";

export const resolvePlanKey = (plan) => {
  if (plan == null || plan === false || plan === "") return null;

  const values = Array.isArray(plan) ? plan : [plan];
  for (const value of values) {
    if (value === false || value == null || String(value).trim() === "") continue;
    const alias = String(value).trim().toLowerCase();
    if (PLAN_ALIASES[alias]) return PLAN_ALIASES[alias];
  }
  return null;
};

export const getPlanDetails = (plan) => {
  const key = resolvePlanKey(plan);
  return key ? PLAN_CATALOG[key] : null;
};

export const formatPlanLabel = (plan) => {
  const details = getPlanDetails(plan);
  if (details) return details.name;

  if (plan == null || plan === false || plan === "") return null;
  const values = Array.isArray(plan) ? plan : [plan];
  const labels = values
    .filter((value) => value !== false && value != null && String(value).trim() !== "")
    .map((value) => String(value).trim());
  return labels.length ? labels.join(", ") : null;
};

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const ctaButton = ({ href, label }) => `
  <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto;">
    <tr>
      <td align="center" style="border-radius:6px;background:${COLORS.ctaBg};border:1px solid ${COLORS.gold};">
        <a
          href="${escapeHtml(href)}"
          style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:700;color:${COLORS.ctaText};text-decoration:none;font-family:Georgia,'Times New Roman',serif;letter-spacing:1px;text-transform:uppercase;"
        >
          ${escapeHtml(label)}
        </a>
      </td>
    </tr>
  </table>
`;

const renderPlanMiniCard = (planDetails) => {
  if (!planDetails) return "";

  const featuresHtml = planDetails.features
    .map((feature) => {
      const icon = feature.included ? "✓" : "✕";
      const color = feature.included ? COLORS.dark : COLORS.mutedText;
      const weight = feature.included ? "500" : "400";
      return `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid ${COLORS.cream};font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${color};font-weight:${weight};">
            <span style="color:${feature.included ? COLORS.primary : COLORS.mutedText};margin-right:8px;">${icon}</span>
            ${escapeHtml(feature.text)}
          </td>
        </tr>
      `;
    })
    .join("");

  const badgeHtml = planDetails.badge
    ? `
      <span style="display:inline-block;margin-left:8px;padding:4px 10px;border-radius:999px;background:${planDetails.headerColor};color:${COLORS.creamText};font-size:10px;letter-spacing:1px;font-family:Arial,Helvetica,sans-serif;vertical-align:middle;">
        ${escapeHtml(planDetails.badge)}
      </span>
    `
    : "";

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px;border:2px solid ${planDetails.borderColor};border-radius:12px;overflow:hidden;background:${COLORS.white};">
      <tr>
        <td style="padding:14px 18px;background:${planDetails.headerColor};">
          <p style="margin:0 0 4px;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:${COLORS.creamText};font-family:Arial,Helvetica,sans-serif;">
            Plan seleccionado
          </p>
          <p style="margin:0;font-size:22px;line-height:1.3;color:${COLORS.white};font-family:Georgia,'Times New Roman',serif;">
            ${escapeHtml(planDetails.name)}${badgeHtml}
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:18px 18px 8px;background:${COLORS.gray};">
          <p style="margin:0;font-size:28px;line-height:1.2;color:${COLORS.dark};font-family:Georgia,'Times New Roman',serif;">
            ${escapeHtml(planDetails.price)}
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:4px 18px 16px;background:${COLORS.white};">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            ${featuresHtml}
          </table>
        </td>
      </tr>
    </table>
  `;
};

const baseLayout = ({ title, preheader, bodyHtml }) => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.bodyBg};font-family:Georgia,'Times New Roman',serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    ${escapeHtml(preheader)}
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${COLORS.bodyBg};padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:580px;background:${COLORS.cardBg};border:1px solid ${COLORS.border};overflow:hidden;">
          <tr>
            <td align="center" style="padding:0;background:${COLORS.headerBg};">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="height:4px;background:${COLORS.gold};font-size:0;line-height:0;">&nbsp;</td>
                </tr>
                <tr>
                  <td align="center" style="padding:36px 24px 28px;">
                    <img
                      src="cid:${LOGO_CONTENT_ID}"
                      alt="Flammes Rouges"
                      width="240"
                      style="display:block;width:240px;max-width:82%;height:auto;border:0;"
                    />
                  </td>
                </tr>
                <tr>
                  <td style="height:4px;background:${COLORS.primary};font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 28px;color:${COLORS.bodyText};background:${COLORS.cardBg};">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="background:${COLORS.footerBg};padding:0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="height:3px;background:${COLORS.gold};font-size:0;line-height:0;">&nbsp;</td>
                </tr>
                <tr>
                  <td align="center" style="padding:22px 28px 26px;">
                    <p style="margin:0 0 6px;font-size:13px;letter-spacing:2px;text-transform:uppercase;color:${COLORS.footerText};font-family:Georgia,'Times New Roman',serif;">
                      Flammes Rouges
                    </p>
                    <p style="margin:0;font-size:12px;line-height:1.5;color:${COLORS.gold};font-family:Arial,Helvetica,sans-serif;">
                      © ${new Date().getFullYear()} Flammes Rouges · Todos los derechos reservados
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

/**
 * Plantilla de confirmación de registro (anunciante o cliente).
 * Para anunciantes, incluye mini card del plan seleccionado.
 */
export const registrationConfirmationTemplate = ({
  name,
  email,
  role,
  plan
}) => {
  const safeName = escapeHtml(name || "Usuario");
  const safeEmail = escapeHtml(email || "");
  const isAdvertiser = role === "anunciante";
  const roleLabel = isAdvertiser ? "anunciante" : "cliente";
  const planDetails = isAdvertiser ? getPlanDetails(plan) : null;
  const planLabel = planDetails?.name || (isAdvertiser ? formatPlanLabel(plan) : null);
  const webUrl = getWebUrl();

  const planBlock = isAdvertiser
    ? planDetails
      ? renderPlanMiniCard(planDetails)
      : planLabel
        ? `
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px;border:1px solid ${COLORS.border};border-radius:8px;overflow:hidden;">
            <tr>
              <td style="padding:16px 18px;background:${COLORS.gray};">
                <p style="margin:0 0 6px;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:${COLORS.mutedText};font-family:Arial,Helvetica,sans-serif;">
                  Plan seleccionado
                </p>
                <p style="margin:0;font-size:18px;font-weight:700;color:${COLORS.primary};font-family:Georgia,'Times New Roman',serif;">
                  ${escapeHtml(planLabel)}
                </p>
              </td>
            </tr>
          </table>
        `
        : ""
    : "";

  const bodyHtml = `
    <p style="margin:0 0 8px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${COLORS.gold};font-family:Arial,Helvetica,sans-serif;">
      Confirmación de registro
    </p>
    <h1 style="margin:0 0 16px;font-size:28px;line-height:1.25;color:${COLORS.dark};font-weight:400;">
      ¡Bienvenido/a a <span style="color:${COLORS.primary};">Flammes Rouges</span>!
    </h1>
    <p style="margin:0 0 22px;font-size:15px;line-height:1.7;color:${COLORS.bodyText};font-family:Arial,Helvetica,sans-serif;">
      Hola <strong style="color:${COLORS.accent};">${safeName}</strong>, tu cuenta de
      <strong style="color:${COLORS.primary};">${roleLabel}</strong> se creó correctamente.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px;border:1px solid ${COLORS.border};border-radius:8px;overflow:hidden;">
      <tr>
        <td style="padding:16px 18px;background:${COLORS.white};">
          <p style="margin:0 0 6px;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:${COLORS.mutedText};font-family:Arial,Helvetica,sans-serif;">
            Correo registrado
          </p>
          <p style="margin:0;font-size:15px;color:${COLORS.dark};font-family:Arial,Helvetica,sans-serif;">
            ${safeEmail}
          </p>
        </td>
      </tr>
    </table>

    ${planBlock}

    <p style="margin:0 0 28px;font-size:14px;line-height:1.7;color:${COLORS.mutedText};font-family:Arial,Helvetica,sans-serif;">
      Ya puedes iniciar sesión y completar tu perfil para aprovechar todas las funciones de la plataforma.
    </p>

    ${ctaButton({ href: webUrl, label: "Ir a Flammes Rouges" })}
  `;

  const html = baseLayout({
    title: "Confirmación de registro - Flammes Rouges",
    preheader: `Tu cuenta de ${roleLabel} fue creada correctamente.`,
    bodyHtml
  });

  const textLines = [
    `¡Bienvenido/a a Flammes Rouges!`,
    ``,
    `Hola ${name || "Usuario"}, tu cuenta de ${roleLabel} se creó correctamente.`,
    `Correo registrado: ${email || ""}`
  ];

  if (planDetails) {
    textLines.push(
      `Plan seleccionado: ${planDetails.name}`,
      `Precio: ${planDetails.price}`,
      ...planDetails.features.map(
        (feature) => `${feature.included ? "✓" : "✕"} ${feature.text}`
      )
    );
  } else if (planLabel) {
    textLines.push(`Plan seleccionado: ${planLabel}`);
  }

  textLines.push(``, `Ingresa aquí: ${webUrl}`);

  return {
    subject: "Confirmación de registro - Flammes Rouges",
    html,
    text: textLines.join("\n")
  };
};

/**
 * Plantilla de recuperación de contraseña (mismo look & feel).
 */
export const passwordResetTemplate = ({ name, resetUrl }) => {
  const safeName = escapeHtml(name || "Usuario");

  const bodyHtml = `
    <p style="margin:0 0 8px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${COLORS.gold};font-family:Arial,Helvetica,sans-serif;">
      Seguridad de la cuenta
    </p>
    <h1 style="margin:0 0 16px;font-size:26px;line-height:1.25;color:${COLORS.dark};font-weight:400;">
      Recuperación de <span style="color:${COLORS.primary};">contraseña</span>
    </h1>
    <p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:${COLORS.bodyText};font-family:Arial,Helvetica,sans-serif;">
      Hola <strong style="color:${COLORS.accent};">${safeName}</strong>, recibimos una solicitud para restablecer tu contraseña.
    </p>
    <p style="margin:0 0 28px;font-size:14px;line-height:1.7;color:${COLORS.mutedText};font-family:Arial,Helvetica,sans-serif;">
      Este enlace es válido por 1 hora. Si no solicitaste este cambio, puedes ignorar este correo.
    </p>
    ${ctaButton({ href: resetUrl, label: "Restablecer contraseña" })}
  `;

  return {
    subject: "Recuperación de contraseña - Flammes Rouges",
    html: baseLayout({
      title: "Recuperación de contraseña - Flammes Rouges",
      preheader: "Restablece tu contraseña de Flammes Rouges.",
      bodyHtml
    }),
    text: `Hola ${name || "Usuario"},\n\nRestablece tu contraseña aquí (válido 1 hora):\n${resetUrl}\n\nSi no solicitaste este cambio, ignora este correo.`
  };
};
