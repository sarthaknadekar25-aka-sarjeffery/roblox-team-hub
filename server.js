// ============================================================
// ROBLOX STUDIO TEAM HUB — server.js
// Sarthak's Studio recruitment portal backend
// Node.js + Express | JSON-file DB | Render-ready | No build step
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

// ---------- Path setup (ESM has no __dirname) ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "applications.json");

// ---------- Config ----------
const PORT = Number(process.env.PORT || 3000);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "change_me";
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || "";

if (!process.env.ADMIN_PASSWORD || ADMIN_PASSWORD === "change_me") {
  console.warn("[warn] ADMIN_PASSWORD is default. Set a strong password in .env / Render env vars.");
}

const VALID_ROLES = [
  "Scripter",
  "Builder",
  "UI Designer",
  "Modeler",
  "Animator",
  "Composer",
  "Manager",
  "Tester",
];

const VALID_STATUSES = ["pending", "accepted", "rejected"];
const VALID_COMPENSATION = ["Unpaid", "Rev-share", "Paid", "Open to discuss"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// ---------- Ensure data folder + DB file exist ----------
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

// ---------- DB helpers ----------
function loadApplications() {
  try {
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveApplications(apps) {
  // Atomic-ish write: tmp + rename to avoid corruption on Render restarts
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
  // Strip < > to neutralise basic XSS payloads, trim + cap length
  return value.replace(/[<>]/g, "").trim().slice(0, maxLen);
}

function sanitizeObject(obj, maxLen = 2000) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "string") return sanitizeString(obj, maxLen);
  if (Array.isArray(obj)) return obj.map((v) => sanitizeObject(v, maxLen));
  if (typeof obj === "object") {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      const cleanKey = sanitizeString(k, 120);
      out[cleanKey] = sanitizeObject(v, maxLen);
    }
    return out;
  }
  return obj;
}

function isValidEmail(email) {
  return typeof email === "string" && EMAIL_RE.test(email.trim());
}

function getClientIp(req) {
  // Trust Render proxy header, fall back to Express ip
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length > 0) return fwd.split(",")[0].trim();
  return req.ip || "unknown";
}

// ---------- Discord webhook ----------
async function sendDiscordWebhook(app) {
  if (!DISCORD_WEBHOOK_URL || DISCORD_WEBHOOK_URL.includes("xxx/yyy")) {
    console.log("[info] Discord webhook not configured — skipping.");
    return;
  }
  const embed = {
    title: `New Application: ${app.role}`,
    color: 15844367, // gold 0xF1C40F-ish (spec: 15844367)
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

// ---------- App setup ----------
const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1); // required on Render for correct IP + rate-limit

app.use(
  helmet({
    contentSecurityPolicy: false, // allow Google Fonts + inline styles used by vanilla UI
    crossOriginEmbedderPolicy: false,
  })
);
// Same-origin friendly: reflect origin but no credentials needed
app.use(cors({ origin: true }));
app.use(express.json({ limit: "64kb" }));

// General API throttle (abuse protection, separate from strict apply limit)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", generalLimiter);

// Strict: 3 applications per IP per hour (spec)
const applyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "Rate limit exceeded. You can submit up to 3 applications per hour." },
});

// ---------- Validation ----------
function validateApplication(body) {
  const errors = [];
  const b = body || {};

  if (!VALID_ROLES.includes(b.role)) errors.push("Invalid role selected.");
  if (!b.fullName || b.fullName.trim().length < 2) errors.push("Full name is required (min 2 chars).");
  if (!isValidEmail(b.email)) errors.push("A valid email address is required.");
  if (!b.discord || b.discord.trim().length < 2) errors.push("Discord tag is required.");
  if (!b.robloxUsername || b.robloxUsername.trim().length < 2) errors.push("Roblox username is required.");
  if (!b.timezone || b.timezone.trim().length < 2) errors.push("Country / Timezone is required.");
  if (!b.hoursPerWeek || String(b.hoursPerWeek).trim().length === 0) errors.push("Hours per week is required.");
  if (!b.whyJoin || b.whyJoin.trim().length < 20) errors.push("Why join needs at least 20 characters.");
  if (!b.standout || b.standout.trim().length < 10) errors.push("Standout answer needs at least 10 characters.");
  if (b.agreeNDA !== true) errors.push("You must agree to the NDA.");
  if (!VALID_COMPENSATION.includes(b.compensation)) errors.push("Invalid compensation option.");

  // Role-specific answers must exist (detailed per-role checks live client-side;
  // server enforces presence so no empty bypass is possible)
  if (!b.roleAnswers || typeof b.roleAnswers !== "object" || Object.keys(b.roleAnswers).length === 0) {
    errors.push("Role-specific answers are required.");
  }

  // Length caps (DoS / storage protection)
  const tooLong = (v, n) => typeof v === "string" && v.length > n;
  if (tooLong(b.fullName, 120)) errors.push("Full name too long.");
  if (tooLong(b.whyJoin, 3000)) errors.push("Why-join answer too long (max ~3000 chars).");
  if (tooLong(b.standout, 3000)) errors.push("Standout answer too long.");

  return errors;
}

// ---------- Routes ----------

// Health check (Render + uptime monitors)
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// Submit application
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
    // Fire-and-forget webhook (don't block the response)
    sendDiscordWebhook(record).catch(() => {});
    return res.status(201).json({ ok: true, id: record.id });
  } catch (err) {
    console.error("[error] saving application:", err.message);
    return res.status(500).json({ ok: false, error: "Failed to save application. Try again." });
  }
});

// Admin login — verifies env password
app.post("/api/admin/login", (req, res) => {
  const { password } = req.body || {};
  if (typeof password === "string" && password === ADMIN_PASSWORD) {
    return res.json({ ok: true });
  }
  return res.status(401).json({ ok: false, error: "Invalid password." });
});

// Admin auth middleware (header-based, no sessions to keep it single-file)
function requireAdmin(req, res, next) {
  const pw = req.headers["x-admin-password"];
  if (typeof pw === "string" && pw === ADMIN_PASSWORD) return next();
  return res.status(401).json({ ok: false, error: "Unauthorized." });
}

// List all applications (newest first)
app.get("/api/applications", requireAdmin, (_req, res) => {
  const apps = loadApplications().sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  res.json({ ok: true, count: apps.length, applications: apps });
});

// Update status
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

// Delete application
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
// Versioned assets (?v=N) cache for a year; HTML never caches so deploys show up on plain refresh.
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

// Fallback to index for unknown non-API routes
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

// ---------- Start ----------
app.listen(PORT, () => {
  console.log(`⚔️  Sarthak's Studio Team Hub running on http://localhost:${PORT}`);
  console.log(`   Admin dashboard: http://localhost:${PORT}/admin.html`);
});
