
import express from "express";
import dotenv from "dotenv";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import nodemailer from "nodemailer";
import { initHerald, sendVerdictDM } from "./herald.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "applications.json");

const PORT = Number(process.env.PORT || 3000);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "change_me";
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || "";
const DISCORD_STAFF_WEBHOOK_URL = process.env.DISCORD_STAFF_WEBHOOK_URL || DISCORD_WEBHOOK_URL;
const DISCORD_INVITE_URL = process.env.DISCORD_INVITE_URL || "https://discord.gg/empireforge";
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || "";
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID || "";
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = String(process.env.SMTP_PASS || "").replace(/\s/g, "");

if (ADMIN_PASSWORD === "change_me") {
  console.warn("[warn] ADMIN_PASSWORD is still the default. Set a strong one in .env / Render env vars.");
}

const VALID_ROLES = ["Scripter", "Builder", "UI Designer", "Modeler", "Animator", "Composer", "Manager", "Tester"];
const VALID_STATUSES = ["pending", "accepted", "rejected"];
const VALID_COMPENSATION = ["Unpaid", "Rev-share", "Open to discuss"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function ensureDatabase() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, "[]", "utf-8");
  } catch (err) {
    console.error("[fatal] Cannot create data directory:", err.message);
    process.exit(1);
  }
}
ensureDatabase();

function loadApplications() {
  try {
    const parsed = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveApplications(apps) {
  const tmp = DB_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(apps, null, 2), "utf-8");
  fs.renameSync(tmp, DB_FILE);
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

function sanitizeString(value, maxLen = 2000) {
  if (typeof value !== "string") return "";
  return value.replace(/[<>]/g, "").trim().slice(0, maxLen);
}

function sanitizeObject(obj, maxLen = 2000) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "string") return sanitizeString(obj, maxLen);
  if (Array.isArray(obj)) return obj.map((v) => sanitizeObject(v, maxLen));
  if (typeof obj === "object") {
    const out = {};
    for (const [k, v] of Object.entries(obj)) out[sanitizeString(k, 120)] = sanitizeObject(v, maxLen);
    return out;
  }
  return obj;
}

function isValidEmail(email) {
  return typeof email === "string" && EMAIL_RE.test(email.trim());
}

function getClientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length > 0) return fwd.split(",")[0].trim();
  return req.ip || "unknown";
}

async function sendDiscordWebhook(app) {
  if (!DISCORD_WEBHOOK_URL || DISCORD_WEBHOOK_URL.includes("xxx/yyy") || DISCORD_WEBHOOK_URL === "none") return;
  const embed = {
    title: `New Application: ${app.role}`,
    color: 15844367,
    fields: [
      { name: "Name", value: String(app.fullName || "-").slice(0, 256), inline: true },
      { name: "Discord", value: String(app.discord || "-").slice(0, 256), inline: true },
      { name: "Email", value: String(app.email || "-").slice(0, 256), inline: true },
      { name: "Timezone", value: String(app.timezone || app.country || "-").slice(0, 256), inline: true },
      { name: "Portfolio", value: String(app.portfolio || "-").slice(0, 512), inline: false },
      { name: "Hours / week", value: String(app.hoursPerWeek || "-").slice(0, 64), inline: true },
      { name: "Status", value: String(app.status || "pending").slice(0, 64), inline: true },
    ],
    footer: { text: `Sarthak's Studio • ${app.id}` },
    timestamp: new Date().toISOString(),
  };
  try {
    const res = await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    });
    if (!res.ok) console.warn("[warn] Discord webhook failed:", res.status);
  } catch (err) {
    console.warn("[warn] Discord webhook error:", err.message);
  }
}

let mailer = null;
if (SMTP_USER && SMTP_PASS) {
  mailer = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
} else {
  console.log("[info] SMTP not configured — applicant emails off (Discord pings still work if webhook set).");
}

function firstNameOf(app) {
  return String(app.fullName || "friend").split(" ")[0] || "friend";
}

async function sendStatusEmail(app, status) {
  if (!mailer || !app.email || !isValidEmail(app.email)) return false;
  const accepted = status === "accepted";
  const name = firstNameOf(app);
  const subject = accepted
    ? `You're in! ${app.role} — Sarthak's Studio ⚔️`
    : `Update on your ${app.role} application — Sarthak's Studio`;
  const text = accepted
    ? `Hi ${name}!\n\nGreat news — you've been ACCEPTED as ${app.role} at Sarthak's Studio!\n\nNext steps:\n1. Join our Discord: ${DISCORD_INVITE_URL}\n2. Say hi in the team channel and tell us your Discord tag (${app.discord})\n3. Watch for your first trial task within a couple of days\n\nWelcome to the team!\n— Sarthak`
    : `Hi ${name},\n\nThanks for applying as ${app.role} at Sarthak's Studio. We've decided to go a different way this time — this is about fit and timing, not talent.\n\nPlease keep building and feel free to apply again in the future. You're always welcome in our Discord: ${DISCORD_INVITE_URL}\n\n— Sarthak`;
  try {
    await mailer.sendMail({
      from: `"Sarthak's Studio" <${SMTP_USER}>`,
      to: app.email,
      subject,
      text,
    });
    return true;
  } catch (err) {
    console.warn("[warn] status email failed:", err.message);
    return false;
  }
}

async function sendStatusDiscord(app, status) {
  const url = DISCORD_STAFF_WEBHOOK_URL;
  if (!url || url.includes("xxx/yyy") || url === "none") return false;
  const accepted = status === "accepted";
  const embed = {
    title: `${accepted ? "✅ Accepted" : "❌ Rejected"}: ${app.fullName} — ${app.role}`,
    color: accepted ? 5763719 : 15548997,
    description: accepted
      ? `Please welcome them! Reach them at **${app.discord}**`
      : "Encourage them to keep building and reapply later.",
    fields: [
      { name: "Discord", value: String(app.discord || "-").slice(0, 256), inline: true },
      { name: "Email", value: String(app.email || "-").slice(0, 256), inline: true },
      { name: "Role", value: String(app.role || "-").slice(0, 128), inline: true },
    ],
    footer: { text: `Sarthak's Studio • ${app.id}` },
    timestamp: new Date().toISOString(),
  };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    });
    if (!res.ok) console.warn("[warn] status Discord ping failed:", res.status);
    return res.ok;
  } catch (err) {
    console.warn("[warn] status Discord ping error:", err.message);
    return false;
  }
}

initHerald({ token: DISCORD_BOT_TOKEN, guildId: DISCORD_GUILD_ID });

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: true }));
app.use(express.json({ limit: "64kb" }));

app.use("/api/", rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false }));

const applyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "Rate limit exceeded. You can submit up to 3 applications per hour." },
});

function validateApplication(body) {
  const errors = [];
  const b = body || {};
  if (!VALID_ROLES.includes(b.role)) errors.push("Invalid role selected.");
  if (!b.fullName || b.fullName.trim().length < 2) errors.push("Full name is required (min 2 chars).");
  if (b.email && String(b.email).trim() !== "" && !isValidEmail(b.email)) errors.push("Invalid email address (or leave it blank).");
  const hasEmail = !!(b.email && String(b.email).trim() !== "");
  const hasDiscord = !!(b.discord && b.discord.trim().length >= 2);
  const hasRoblox = !!(b.robloxUsername && b.robloxUsername.trim().length >= 2);
  if (!hasEmail && !hasDiscord && !hasRoblox) {
    errors.push("At least one contact is required (Email, Discord, or Roblox username).");
  }
  if (b.discord && b.discord.trim().length > 0 && b.discord.trim().length < 2) errors.push("Discord tag looks too short.");
  if (b.robloxUsername && b.robloxUsername.trim().length > 0 && b.robloxUsername.trim().length < 2) errors.push("Roblox username looks too short.");
  if (!b.timezone || b.timezone.trim().length < 2) errors.push("Country / Timezone is required.");
  if (!b.hoursPerWeek || String(b.hoursPerWeek).trim().length === 0) errors.push("Hours per week is required.");
  if (!b.whyJoin || b.whyJoin.trim().length < 20) errors.push("Why join needs at least 20 characters.");
  if (!b.standout || b.standout.trim().length < 10) errors.push("Standout answer needs at least 10 characters.");
  if (b.agreeNDA !== true) errors.push("You must agree to the NDA.");
  if (!VALID_COMPENSATION.includes(b.compensation)) errors.push("Invalid compensation option.");
  if (!b.roleAnswers || typeof b.roleAnswers !== "object" || Object.keys(b.roleAnswers).length === 0) {
    errors.push("Role-specific answers are required.");
  }
  if (typeof b.fullName === "string" && b.fullName.length > 120) errors.push("Full name too long.");
  if (typeof b.whyJoin === "string" && b.whyJoin.length > 3000) errors.push("Why-join answer too long.");
  if (typeof b.standout === "string" && b.standout.length > 3000) errors.push("Standout answer too long.");
  return errors;
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.post("/api/apply", applyLimiter, async (req, res) => {
  const ip = getClientIp(req);
  const clean = sanitizeObject(req.body || {});
  const errors = validateApplication(clean);
  if (errors.length > 0) {
    console.log(`[apply] rejected from ${ip}: ${errors.join(" | ")}`);
    return res.status(400).json({ ok: false, errors });
  }
  const record = {
    id: generateId(),
    role: clean.role,
    fullName: sanitizeString(clean.fullName, 120),
    email: sanitizeString(clean.email, 160).toLowerCase(),
    discord: sanitizeString(clean.discord, 80),
    robloxUsername: sanitizeString(clean.robloxUsername, 80),
    robloxLink: sanitizeString(clean.robloxLink || "", 300),
    age: sanitizeString(clean.age || "", 10),
    country: sanitizeString(clean.country || "", 120),
    timezone: sanitizeString(clean.timezone, 120),
    hoursPerWeek: sanitizeString(String(clean.hoursPerWeek), 20),
    portfolio: sanitizeString(clean.portfolio || "", 600),
    whyJoin: sanitizeString(clean.whyJoin, 3000),
    standout: sanitizeString(clean.standout, 3000),
    compensation: clean.compensation,
    agreeNDA: true,
    roleAnswers: sanitizeObject(clean.roleAnswers || {}, 3000),
    status: "pending",
    ip,
    createdAt: new Date().toISOString(),
  };
  try {
    const apps = loadApplications();
    apps.push(record);
    saveApplications(apps);
    console.log(`[apply] ${record.role} — ${record.fullName} (${ip}) id=${record.id}`);
    sendDiscordWebhook(record).catch(() => {});
    return res.status(201).json({ ok: true, id: record.id });
  } catch (err) {
    console.error("[error] saving application:", err.message);
    return res.status(500).json({ ok: false, error: "Failed to save application. Try again." });
  }
});

app.post("/api/admin/login", (req, res) => {
  const { password } = req.body || {};
  if (typeof password === "string" && password === ADMIN_PASSWORD) return res.json({ ok: true });
  return res.status(401).json({ ok: false, error: "Invalid password." });
});

function requireAdmin(req, res, next) {
  const pw = req.headers["x-admin-password"];
  if (typeof pw === "string" && pw === ADMIN_PASSWORD) return next();
  return res.status(401).json({ ok: false, error: "Unauthorized." });
}

app.get("/api/applications", requireAdmin, (_req, res) => {
  const apps = loadApplications().sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  res.json({ ok: true, count: apps.length, applications: apps });
});

app.patch("/api/applications/:id", requireAdmin, async (req, res) => {
  const { status } = req.body || {};
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ ok: false, error: "Status must be pending | accepted | rejected." });
  }
  const apps = loadApplications();
  const idx = apps.findIndex((a) => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ ok: false, error: "Application not found." });
  apps[idx].status = status;
  apps[idx].updatedAt = new Date().toISOString();
  saveApplications(apps);
  const results = await Promise.allSettled([sendStatusEmail(apps[idx], status), sendVerdictDM(apps[idx], status)]);
  const notified = {
    email: results[0].status === "fulfilled" && results[0].value === true,
    dm: results[1].status === "fulfilled" && results[1].value === true,
  };
  console.log(`[admin] ${req.params.id} -> ${status} (email:${notified.email} dm:${notified.dm})`);
  res.json({ ok: true, application: apps[idx], notified });
});

app.delete("/api/applications/:id", requireAdmin, (req, res) => {
  const apps = loadApplications();
  const idx = apps.findIndex((a) => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ ok: false, error: "Application not found." });
  const [removed] = apps.splice(idx, 1);
  saveApplications(apps);
  console.log(`[admin] deleted ${req.params.id}`);
  res.json({ ok: true, deleted: removed.id });
});

app.use(
  express.static(PUBLIC_DIR, {
    maxAge: "1h",
    extensions: ["html"],
    setHeaders(res, filePath) {
      if (filePath.endsWith(".html")) {
        res.setHeader("Cache-Control", "no-store");
      } else if (res.req && res.req.url && res.req.url.includes("?v=")) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      }
    },
  })
);

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

app.listen(PORT, () => {
  console.log(`⚔️  Sarthak's Studio Team Hub running on http://localhost:${PORT}`);
  console.log(`   Admin dashboard: http://localhost:${PORT}/admin.html`);
});
