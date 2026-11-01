/**
 * Envío masivo de correo de confirmación de registro a anunciantes (Profiles).
 *
 * Estrategia:
 *  1) Dry-run por defecto (lista candidatos, NO envía)
 *  2) Envío real solo con --send
 *  3) Delay entre correos para respetar rate limit de Resend
 *  4) --limit=N para probar con pocos primero
 *  5) Log JSONL de éxitos / fallos / skips
 *
 * Filtros:
 *  - isActiveProfile: true
 *  - email presente
 *  - plan válido (["1"] | ["2"] | ["3"] | ["free"] o alias)
 *  - excluye admins (User/Client isAdmin)
 *  - excluye emails de prueba (TEST_EMAIL + BULK_EMAIL_EXCLUDE)
 *
 * Uso:
 *   npm run email:bulk:dry
 *   npm run email:bulk:dry -- --limit=5
 *   npm run email:bulk -- --limit=5
 *   npm run email:bulk -- --delay=800
 *
 * IMPORTANTE: apunta MONGO_URI a PRD en .env antes de correr.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import Profile from "../src/models/profile.js";
import User from "../src/models/User.js";
import Client from "../src/models/Client.js";
import sendRegistrationEmail from "../src/utils/sendRegistrationEmail.js";
import { getPlanDetails } from "../src/utils/emailTemplates.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const parseArgs = () => {
  const args = process.argv.slice(2);
  const getFlag = (name) => args.includes(name);
  const getValue = (name, fallback) => {
    const hit = args.find((arg) => arg.startsWith(`${name}=`));
    return hit ? hit.split("=").slice(1).join("=") : fallback;
  };

  return {
    send: getFlag("--send"),
    limit: Number(getValue("--limit", "0")) || 0,
    delayMs: Number(getValue("--delay", "700")) || 700
  };
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const hasValidPlan = (plan) => Boolean(getPlanDetails(plan));

const normalizeEmail = (email = "") => String(email).trim().toLowerCase();

const buildExcludeEmailSet = () => {
  const fromEnv = (process.env.BULK_EMAIL_EXCLUDE || "")
    .split(",")
    .map((item) => normalizeEmail(item))
    .filter(Boolean);

  const extras = [
    process.env.TEST_EMAIL,
    "flammerougeoficial@gmail.com"
  ]
    .map((item) => normalizeEmail(item || ""))
    .filter(Boolean);

  return new Set([...fromEnv, ...extras]);
};

const createLogger = () => {
  const logsDir = path.join(__dirname, "logs");
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filePath = path.join(logsDir, `bulk-registration-${stamp}.jsonl`);
  const stream = fs.createWriteStream(filePath, { flags: "a" });

  const write = (entry) => {
    stream.write(`${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`);
  };

  return {
    filePath,
    write,
    close: () =>
      new Promise((resolve) => {
        stream.end(resolve);
      })
  };
};

const loadAdminObjectIds = async () => {
  const [adminUsers, adminClients] = await Promise.all([
    User.find({ isAdmin: true }).select("_id email").lean(),
    Client.find({ isAdmin: true }).select("_id email").lean()
  ]);

  return {
    adminIds: new Set(
      [...adminUsers, ...adminClients].map((doc) => String(doc._id))
    ),
    adminEmails: new Set(
      [...adminUsers, ...adminClients]
        .map((doc) => normalizeEmail(doc.email))
        .filter(Boolean)
    )
  };
};

const main = async () => {
  const { send, limit, delayMs } = parseArgs();
  const excludeEmails = buildExcludeEmailSet();

  if (!process.env.MONGO_URI) {
    console.error("❌ Falta MONGO_URI en .env");
    process.exit(1);
  }

  if (send && !process.env.RESEND_API_KEY) {
    console.error("❌ Falta RESEND_API_KEY en .env (requerida para --send)");
    process.exit(1);
  }

  if (send && !process.env.EMAIL_FROM) {
    console.warn("⚠️  EMAIL_FROM no está definido; Resend usará el fallback.");
  }

  console.log("══════════════════════════════════════════════");
  console.log(" Bulk registration emails — Flammes Rouges");
  console.log("══════════════════════════════════════════════");
  console.log(` Modo:     ${send ? "SEND (envío real)" : "DRY-RUN (solo listar)"}`);
  console.log(` Limit:    ${limit > 0 ? limit : "sin límite"}`);
  console.log(` Delay:    ${delayMs} ms`);
  console.log(` WEB_URL:  ${process.env.WEB_URL || "(fallback)"}`);
  console.log(` Exclude:  ${[...excludeEmails].join(", ") || "(ninguno)"}`);
  console.log("══════════════════════════════════════════════\n");

  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Conectado a MongoDB\n");

  const { adminIds, adminEmails } = await loadAdminObjectIds();
  adminEmails.forEach((email) => excludeEmails.add(email));

  const profiles = await Profile.find({
    isActiveProfile: true,
    email: { $exists: true, $nin: [null, ""] }
  })
    .select("_id displayName email plan objectId createdAt")
    .lean();

  const candidates = [];
  const skipped = {
    noPlan: 0,
    excludedEmail: 0,
    admin: 0,
    duplicateEmail: 0
  };
  const seenEmails = new Set();

  for (const profile of profiles) {
    const email = normalizeEmail(profile.email);

    if (!email) {
      skipped.excludedEmail += 1;
      continue;
    }

    if (excludeEmails.has(email)) {
      skipped.excludedEmail += 1;
      continue;
    }

    if (adminIds.has(String(profile.objectId))) {
      skipped.admin += 1;
      continue;
    }

    if (!hasValidPlan(profile.plan)) {
      skipped.noPlan += 1;
      continue;
    }

    if (seenEmails.has(email)) {
      skipped.duplicateEmail += 1;
      continue;
    }
    seenEmails.add(email);

    const planDetails = getPlanDetails(profile.plan);
    candidates.push({
      profileId: String(profile._id),
      displayName: profile.displayName,
      email,
      plan: profile.plan,
      planName: planDetails?.name || null,
      planPrice: planDetails?.price || null
    });
  }

  const selected =
    limit > 0 ? candidates.slice(0, limit) : candidates;

  console.log(`Profiles activos con email: ${profiles.length}`);
  console.log(`Candidatos válidos:         ${candidates.length}`);
  console.log(`Seleccionados a procesar:   ${selected.length}`);
  console.log("Skips:");
  console.log(`  - sin plan válido:   ${skipped.noPlan}`);
  console.log(`  - email excluido:    ${skipped.excludedEmail}`);
  console.log(`  - admin:             ${skipped.admin}`);
  console.log(`  - email duplicado:   ${skipped.duplicateEmail}`);
  console.log("");

  if (!selected.length) {
    console.log("No hay destinatarios para procesar.");
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log("Lista:");
  selected.forEach((item, index) => {
    console.log(
      `  ${String(index + 1).padStart(2, "0")}. ${item.email} | ${item.displayName} | ${item.planName} (${item.planPrice}) | plan=${JSON.stringify(item.plan)}`
    );
  });
  console.log("");

  if (!send) {
    console.log("Dry-run listo. Para enviar de verdad:");
    console.log("  npm run email:bulk -- --limit=5");
    console.log("  npm run email:bulk");
    await mongoose.disconnect();
    process.exit(0);
  }

  const logger = createLogger();
  console.log(`📝 Log: ${logger.filePath}\n`);

  const summary = { sent: 0, failed: 0, skipped: 0 };

  for (let i = 0; i < selected.length; i += 1) {
    const item = selected[i];
    const progress = `[${i + 1}/${selected.length}]`;

    process.stdout.write(`${progress} Enviando a ${item.email}... `);

    const result = await sendRegistrationEmail({
      name: item.displayName || item.email,
      email: item.email,
      role: "anunciante",
      plan: item.plan
    });

    if (result.skipped) {
      summary.skipped += 1;
      console.log("SKIPPED");
      logger.write({ status: "skipped", ...item, error: result.error || "skipped" });
    } else if (result.error) {
      summary.failed += 1;
      console.log("FAIL");
      logger.write({
        status: "failed",
        ...item,
        error: result.error?.message || result.error
      });
    } else {
      summary.sent += 1;
      console.log(`OK (${result.data?.id || "sin id"})`);
      logger.write({
        status: "sent",
        ...item,
        resendId: result.data?.id || null
      });
    }

    if (i < selected.length - 1) {
      await sleep(delayMs);
    }
  }

  await logger.close();
  await mongoose.disconnect();

  console.log("\n══════════════════════════════════════════════");
  console.log(` Enviados:  ${summary.sent}`);
  console.log(` Fallidos:  ${summary.failed}`);
  console.log(` Skipped:   ${summary.skipped}`);
  console.log(` Log:       ${logger.filePath}`);
  console.log("══════════════════════════════════════════════");

  process.exit(summary.failed > 0 ? 1 : 0);
};

main().catch(async (error) => {
  console.error("❌ Error en bulk-send-registration-emails:", error);
  try {
    await mongoose.disconnect();
  } catch (_) {
    // ignore
  }
  process.exit(1);
});
