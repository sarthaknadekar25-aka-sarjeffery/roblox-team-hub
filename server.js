// ============================================================
// SARTHAK'S STUDIO — TEAM HUB  server.js  (v2 fresh build)
// Recruitment portal backend: Express + JSON-file DB.
// No build step. Render-ready.
// ============================================================

import express from "express";
import dotenv from "dotenv";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();

// ---------- Paths (ESM has no __dirname) ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "applications.json");

// ---------- Config ----------
const PORT = Number(process.env.PORT || 3000);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "change_me";
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || "";

if (ADMIN_PASSWORD === "change_me") {
  console.warn("[warn] ADMIN_PASSWORD is still the default. Set a strong one in .env / Render env vars.");
}

const VALID_ROLES = ["Scripter", "Builder", "UI Designer", "Modeler", "Animator", "Composer", "Manager", "Tester"];
const VALID_STATUSES = ["pending", "accepted", "rejected"];
const VALID_COMPENSATION = ["Unpaid", "Rev-share", "Open to discuss"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// ---------- Database (JSON file, atomic writes) ----------
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

// ---------- Security helpers ----------
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

// ---------- Discord webhook (fire-and-forget) ----------
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

// ---------- App ----------
const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1); // correct IPs + rate limits behind Render's proxy

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: true }));
app.use(express.json({ limit: "64kb" }));

// Broad API throttle (the strict per-form limit is separate, below)
app.use("/api/", rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false }));

// Strict: 3 applications per IP per hour
const applyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "Rate limit exceeded. You can submit up to 3 applications per hour." },
});

// ---------- Validation (mirrors the client-side rules) ----------
function validateApplication(body) {
  const errors = [];
  const b = body || {};
  if (!VALID_ROLES.includes(b.role)) errors.push("Invalid role selected.");
  if (!b.fullName || b.fullName.trim().length < 2) errors.push("Full name is required (min 2 chars).");
  if (b.email && String(b.email).trim() !== "" && !isValidEmail(b.email)) errors.push("Invalid email address (or leave it blank).");
  if (!b.discord || b.discord.trim().length < 2) errors.push("Discord tag is required.");
  if (!b.robloxUsername || b.robloxUsername.trim().length < 2) errors.push("Roblox username is required.");
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

// ---------- Routes ----------
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

app.patch("/api/applications/:id", requireAdmin, (req, res) => {
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
  console.log(`[admin] ${req.params.id} -> ${status}`);
  res.json({ ok: true, application: apps[idx] });
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

// ---------- Static frontend ----------
// Pages never cache (deploys appear on plain refresh); versioned assets (?v=N) cache for a year.
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

// ---------- Start ----------
app.listen(PORT, () => {
  console.log(`⚔️  Sarthak's Studio Team Hub running on http://localhost:${PORT}`);
  console.log(`   Admin dashboard: http://localhost:${PORT}/admin.html`);
});
