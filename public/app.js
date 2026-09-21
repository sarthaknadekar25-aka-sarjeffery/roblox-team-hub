/* ============================================================
   SARTHAK'S STUDIO — TEAM HUB  app.js
   Multi-step application • autosave • validation • 3D tilt
   Vanilla JS only, no frameworks.
   ============================================================ */
"use strict";

/* ---------- Constants ---------- */
const DRAFT_KEY = "empireforge_draft_v1";
const DISCORD_INVITE = "https://discord.gg/empireforge";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const ROLE_META = {
  "Scripter":    { icon: "📜", tag: "Luau • Systems" },
  "Builder":     { icon: "🧱", tag: "Worlds • Terrain" },
  "UI Designer": { icon: "🎨", tag: "Figma • HUD" },
  "Modeler":     { icon: "🗿", tag: "Blender • Props" },
  "Animator":    { icon: "🎬", tag: "Moon Animator" },
  "Composer":    { icon: "🎵", tag: "Music • SFX" },
  "Manager":     { icon: "👑", tag: "Community" },
  "Tester":      { icon: "🐞", tag: "QA • All devices" },
};

/* Role-specific questions (spec, all required unless noted) */
const ROLE_QUESTIONS = {
  "Scripter": [
    { key: "luauYears", label: "Years of Luau experience?", type: "select", options: ["< 1 year", "1–2 years", "3–4 years", "5+ years"], required: true },
    { key: "github", label: "GitHub / code portfolio link", type: "url", placeholder: "https://github.com/you/…", required: true },
    { key: "profileService", label: "Have you used ProfileService / DataStoreService?", type: "select", options: ["Yes — shipped with it", "Yes — experimented", "No — willing to learn"], required: true },
    { key: "systemDesc", label: "Describe a game system you built (~100 words)", type: "textarea", placeholder: "e.g. a sword combat system with combos, hitboxes, cooldowns…", required: true, minLen: 50 },
    { key: "hours10", label: "Can you commit 10 hrs/week?", type: "select", options: ["Yes", "No — but 5+ hrs", "No"], required: true },
    { key: "availability", label: "Timezone & best hours to collaborate", type: "text", placeholder: "e.g. IST evenings 7–10pm", required: true },
  ],
  "Builder": [
    { key: "portfolioBuild", label: "Build portfolio link", type: "url", placeholder: "Roblox / Imgur / Drive link…", required: true },
    { key: "style", label: "Preferred build style?", type: "select", options: ["Low-poly", "Realistic", "Stylized", "Mixed"], required: true },
    { key: "terrainEditor", label: "Can you use the Terrain Editor?", type: "select", options: ["Yes — expert", "Yes — basics", "No"], required: true },
    { key: "exampleMap", label: "Describe your best map (theme, size, tricks used)", type: "textarea", placeholder: "e.g. a 2048×2048 castle island with…", required: true, minLen: 30 },
    { key: "deadlines", label: "Can you hit weekly build deadlines?", type: "select", options: ["Yes", "Usually", "No"], required: true },
  ],
  "UI Designer": [
    { key: "portfolioUI", label: "UI portfolio link", type: "url", placeholder: "Figma / Dribbble / Drive…", required: true },
    { key: "tools", label: "Design tools you use?", type: "select", options: ["Figma", "Photoshop", "Figma + Photoshop", "Other"], required: true },
    { key: "mobileFirst", label: "Do you design mobile-first?", type: "select", options: ["Yes — always", "Sometimes", "No — desktop first"], required: true },
    { key: "examples", label: "Describe 2 UI pieces you're proud of", type: "textarea", placeholder: "e.g. an inventory HUD with… + a mobile shop…", required: true, minLen: 30 },
    { key: "constraints", label: "What Roblox UI constraints do you design around?", type: "textarea", placeholder: "e.g. safe-area, TextScaled, 9-slice, small screens…", required: true, minLen: 20 },
  ],
  "Modeler": [
    { key: "software", label: "Modelling software?", type: "select", options: ["Blender", "Maya", "3ds Max", "Other"], required: true },
    { key: "portfolioModel", label: "Model portfolio link", type: "url", placeholder: "ArtStation / Sketchfab / Drive…", required: true },
    { key: "lowPoly", label: "Can you optimise under 10k tris for mobile?", type: "select", options: ["Yes", "With guidance", "No"], required: true },
    { key: "pbr", label: "Do you work with PBR textures?", type: "select", options: ["Yes", "Somewhat", "No"], required: true },
    { key: "triExample", label: "Example: how did you cut tris on a past model?", type: "textarea", placeholder: "e.g. merged verts, baked normals…", required: true, minLen: 20 },
  ],
  "Animator": [
    { key: "portfolioAnim", label: "Animation portfolio link", type: "url", placeholder: "YouTube / Drive with your clips…", required: true },
    { key: "toolsAnim", label: "Animation tools?", type: "text", placeholder: "e.g. Moon Animator + Blender", required: true },
    { key: "rigging", label: "Can you rig custom characters?", type: "select", options: ["Yes", "Basic rigs", "No"], required: true },
    { key: "demoLink", label: "Walk + idle demo link", type: "url", placeholder: "https://…", required: true },
    { key: "rigType", label: "Which rigs have you animated?", type: "select", options: ["R15", "R6", "R15 + R6", "Custom"], required: true },
  ],
  "Composer": [
    { key: "portfolioMusic", label: "Music portfolio (SoundCloud / Drive)", type: "url", placeholder: "https://soundcloud.com/you/…", required: true },
    { key: "daw", label: "Your DAW?", type: "text", placeholder: "e.g. FL Studio, Ableton, BandLab", required: true },
    { key: "loops", label: "Can you deliver seamless loops + battle stingers?", type: "select", options: ["Yes — both", "Loops only", "Stingers only", "No"], required: true },
    { key: "royaltyFree", label: "OK with 100% original, royalty-free delivery?", type: "select", options: ["Yes", "Need to discuss", "No"], required: true },
    { key: "trackDesc", label: "Describe one track that fits a medieval siege", type: "textarea", placeholder: "Tempo, instruments, mood…", required: true, minLen: 20 },
  ],
  "Manager": [
    { key: "discordExp", label: "Discord moderation / management experience?", type: "textarea", placeholder: "Servers managed, member counts, bots used…", required: true, minLen: 20 },
    { key: "ageConfirm", label: "Are you 16 or older?", type: "select", options: ["Yes — 16+", "No — under 16"], required: true },
    { key: "hoursDay", label: "Hours per day you can moderate?", type: "select", options: ["1–2", "3–4", "5+"], required: true },
    { key: "toxicHandling", label: "How would you handle a toxic player spamming chat?", type: "textarea", placeholder: "Warn → mute → … appeal process…", required: true, minLen: 30 },
    { key: "whyManager", label: "Why do you want this role?", type: "textarea", placeholder: "…", required: true, minLen: 20 },
  ],
  "Tester": [
    { key: "devices", label: "Devices you can test on? (list all)", type: "text", placeholder: "e.g. Windows PC + Android phone + Xbox", required: true },
    { key: "bugExp", label: "Have you filed bug reports before?", type: "select", options: ["Yes — many", "A few", "Never — willing to learn"], required: true },
    { key: "reproSteps", label: "Write reproduction steps for a sample bug", type: "textarea", placeholder: "1. Join… 2. Equip sword… 3. Observe… Expected vs actual…", required: true, minLen: 30 },
    { key: "hoursTest", label: "Hours per week for testing?", type: "select", options: ["1–4", "5–9", "10–15", "16+"], required: true },
  ],
};

/* ---------- State ---------- */
const state = {
  step: 1,
  role: "",
  universal: {},
  roleAnswers: {},
};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/* ============================================================
   Toast notifications
   ============================================================ */
function toast(msg, kind = "") {
  const wrap = $("#toast-wrap");
  const el = document.createElement("div");
  el.className = `toast ${kind}`;
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(() => { el.style.opacity = "0"; el.style.transition = "opacity .4s"; }, 3400);
  setTimeout(() => el.remove(), 3900);
}

/* ============================================================
   3D tilt on role cards (pointer-fine devices only)
   ============================================================ */
function initTilt() {
  if (!window.matchMedia("(pointer: fine)").matches) return;
  $$(".role-card, .req-card").forEach((card) => {
    let raf = null;
    card.addEventListener("mousemove", (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      card.style.setProperty("--mx", `${(px + 0.5) * 100}%`);
      card.style.setProperty("--my", `${(py + 0.5) * 100}%`);
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        card.style.transform =
          `perspective(800px) rotateX(${(-py * 10).toFixed(2)}deg) rotateY(${(px * 12).toFixed(2)}deg) translateZ(4px)`;
      });
    });
    card.addEventListener("mouseleave", () => {
      if (raf) cancelAnimationFrame(raf);
      card.style.transform = "perspective(800px) rotateX(0deg) rotateY(0deg)";
    });
  });
}

/* ============================================================
   Role picker (Step 1)
   ============================================================ */
function renderRolePicker() {
  const picker = $("#role-picker");
  picker.innerHTML = "";
  Object.keys(ROLE_QUESTIONS).forEach((role) => {
    const meta = ROLE_META[role] || { icon: "⭐", tag: role };
    const b = document.createElement("button");
    b.type = "button";
    b.className = "picker-card";
    b.setAttribute("role", "radio");
    b.dataset.role = role;
    b.setAttribute("aria-checked", state.role === role ? "true" : "false");
    b.innerHTML = `<div style="font-size:1.6rem">${meta.icon}</div>${role}<small>${meta.tag}</small>`;
    b.addEventListener("click", () => setRole(role));
    picker.appendChild(b);
  });
}

function setRole(role) {
  state.role = role;
  state.roleAnswers = {}; // reset stale answers when switching roles
  $$("#role-picker .picker-card").forEach((c) =>
    c.setAttribute("aria-checked", c.dataset.role === role ? "true" : "false"));
  $$(".role-card").forEach((c) => c.classList.toggle("selected", c.dataset.role === role));
  $("#err-role").textContent = "";
  renderRoleSpecific();
  saveDraft();
}

/* ============================================================
   Role-specific questions (Step 3) — dynamic render
   ============================================================ */
function fieldId(role, key) { return `rq-${role}-${key}`.replace(/\s+/g, "-"); }

function renderRoleSpecific() {
  const box = $("#role-specific");
  const title = $("#roleq-title");
  const role = state.role;
  title.textContent = role ? `${role}` : "Role";
  box.innerHTML = "";
  if (!role || !ROLE_QUESTIONS[role]) {
    box.innerHTML = `<p class="sub">Pick a role in Step 1 first.</p>`;
    return;
  }
  ROLE_QUESTIONS[role].forEach((q) => {
    const wrap = document.createElement("div");
    wrap.className = `field ${q.type === "textarea" ? "field-full" : ""}`;
    const id = fieldId(role, q.key);
    const saved = (state.roleAnswers[q.key] ?? "");
    let control = "";
    if (q.type === "select") {
      control = `<select id="${id}" data-rq="${q.key}">
        <option value="">Select…</option>
        ${q.options.map((o) => `<option ${o === saved ? "selected" : ""}>${o}</option>`).join("")}
      </select>`;
    } else if (q.type === "textarea") {
      control = `<textarea id="${id}" data-rq="${q.key}" rows="3" placeholder="${q.placeholder || ""}">${escapeHtml(saved)}</textarea>`;
    } else {
      const itype = q.type === "url" ? "url" : q.type === "number" ? "number" : "text";
      control = `<input id="${id}" data-rq="${q.key}" type="${itype}" value="${escapeAttr(saved)}" placeholder="${escapeAttr(q.placeholder || "")}" />`;
    }
    wrap.innerHTML = `<label for="${id}">${escapeHtml(q.label)} *</label>${control}<p class="field-error" data-err-rq="${q.key}"></p>`;
    box.appendChild(wrap);
  });
  // Re-attach autosave listeners for the fresh inputs
  $$("#role-specific [data-rq]").forEach((el) =>
    el.addEventListener("input", () => {
      state.roleAnswers[el.dataset.rq] = el.value;
      saveDraft();
    }));
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
function escapeAttr(s) {
  return String(s ?? "").replace(/["<>]/g, "");
}

/* ============================================================
   Character counters
   ============================================================ */
function initCounters() {
  const pairs = [["#f-whyJoin", "#count-whyJoin"], ["#f-standout", "#count-standout"]];
  pairs.forEach(([inputSel, countSel]) => {
    const input = $(inputSel), count = $(countSel);
    const update = () => { count.textContent = `${input.value.length} / ${input.maxLength || 1200}`; };
    input.addEventListener("input", update);
    update();
  });
}

/* ============================================================
   Draft autosave (offline-first via localStorage)
   ============================================================ */
function collectUniversalFromDOM() {
  const get = (id) => $(id)?.value.trim() ?? "";
  return {
    fullName: get("#f-fullName"),
    email: get("#f-email"),
    discord: get("#f-discord"),
    robloxUsername: get("#f-robloxUsername"),
    robloxLink: get("#f-robloxLink"),
    age: get("#f-age"),
    country: get("#f-country"),
    timezone: get("#f-timezone"),
    hoursPerWeek: $("#f-hoursPerWeek")?.value ?? "",
    compensation: $("#f-compensation")?.value ?? "",
    portfolio: get("#f-portfolio"),
    whyJoin: $("#f-whyJoin")?.value ?? "",
    standout: $("#f-standout")?.value ?? "",
    agreeNDA: $("#f-agreeNDA")?.checked === true,
  };
}

function fillUniversalToDOM(u = {}) {
  const set = (id, v) => { const el = $(id); if (el && v !== undefined) el.value = v; };
  set("#f-fullName", u.fullName); set("#f-email", u.email); set("#f-discord", u.discord);
  set("#f-robloxUsername", u.robloxUsername); set("#f-robloxLink", u.robloxLink);
  set("#f-age", u.age); set("#f-country", u.country); set("#f-timezone", u.timezone);
  set("#f-hoursPerWeek", u.hoursPerWeek); set("#f-compensation", u.compensation);
  set("#f-portfolio", u.portfolio); set("#f-whyJoin", u.whyJoin); set("#f-standout", u.standout);
  if (u.agreeNDA) $("#f-agreeNDA").checked = true;
  $$("#role-specific [data-rq]").forEach((el) => {
    if (state.roleAnswers[el.dataset.rq] !== undefined) el.value = state.roleAnswers[el.dataset.rq];
  });
  // refresh counters
  $("#f-whyJoin")?.dispatchEvent(new Event("input"));
  $("#f-standout")?.dispatchEvent(new Event("input"));
}

function saveDraft() {
  state.universal = collectUniversalFromDOM();
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
      step: state.step, role: state.role,
      universal: state.universal, roleAnswers: state.roleAnswers,
    }));
  } catch { /* storage full / private mode — non-fatal */ }
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    state.role = d.role || "";
    state.universal = d.universal || {};
    state.roleAnswers = d.roleAnswers || {};
    fillUniversalToDOM(state.universal);
    if (state.role) {
      renderRolePicker();
      $$("#role-picker .picker-card").forEach((c) =>
        c.setAttribute("aria-checked", c.dataset.role === state.role ? "true" : "false"));
      renderRoleSpecific();
      fillUniversalToDOM(state.universal);
    }
    if (d.step && d.step >= 1 && d.step <= 4) gotoStep(d.step, true);
  } catch { /* corrupt draft — ignore */ }
}

function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
}

/* ============================================================
   Step navigation + validation
   ============================================================ */
function gotoStep(n, silent = false) {
  state.step = n;
  $$(".form-step").forEach((s) => s.classList.toggle("active", s.id === `step-${n}`));
  $$("#steps-bar .step").forEach((li) => {
    const k = Number(li.dataset.step);
    li.classList.toggle("active", k === n);
    li.classList.toggle("done", k < n);
  });
  $("#progress-fill").style.width = `${(n / 4) * 100}%`;
  if (n === 4) renderReview();
  if (!silent) {
    $("#apply").scrollIntoView({ behavior: "smooth", block: "start" });
    saveDraft();
  }
}

function setErr(name, msg) {
  const el = $(`[data-err="${name}"]`);
  if (el) el.textContent = msg || "";
}
function setRqErr(key, msg) {
  const el = $(`[data-err-rq="${key}"]`);
  if (el) el.textContent = msg || "";
}

function validateStep1() {
  if (!state.role) {
    $("#err-role").textContent = "Please pick a role to continue.";
    toast("Pick a role first 👆", "error");
    return false;
  }
  $("#err-role").textContent = "";
  return true;
}

function validateStep2() {
  const u = collectUniversalFromDOM();
  state.universal = u;
  let ok = true;
  const need = (cond, name, msg) => { setErr(name, cond ? "" : msg); if (!cond) ok = false; };

  need(u.fullName.length >= 2, "fullName", "Enter your full name.");
  need(EMAIL_RE.test(u.email), "email", "Enter a valid email.");
  need(u.discord.length >= 2, "discord", "Discord tag is required.");
  need(u.robloxUsername.length >= 2, "robloxUsername", "Roblox username is required.");
  need(u.robloxLink.length > 8 && /^https?:\/\//i.test(u.robloxLink), "robloxLink", "Paste your full Roblox profile URL (https://…).");
  need(u.country.length >= 2, "country", "Country is required.");
  need(u.timezone.length >= 2, "timezone", "Timezone is required.");
  need(!!u.hoursPerWeek, "hoursPerWeek", "Select hours per week.");
  need(!!u.compensation, "compensation", "Select a compensation option.");
  need(u.whyJoin.trim().length >= 20, "whyJoin", "Tell us more (min 20 characters).");
  need(u.standout.trim().length >= 10, "standout", "Tell us more (min 10 characters).");
  need(u.agreeNDA === true, "agreeNDA", "You must agree to the NDA.");

  if (!ok) toast("Fix the highlighted fields ✏️", "error");
  else saveDraft();
  return ok;
}

function validateStep3() {
  const role = state.role;
  const qs = ROLE_QUESTIONS[role] || [];
  let ok = true;
  // pull latest values
  $$("#role-specific [data-rq]").forEach((el) => { state.roleAnswers[el.dataset.rq] = el.value.trim(); });
  qs.forEach((q) => {
    const v = (state.roleAnswers[q.key] || "").trim();
    let msg = "";
    if (q.required && !v) msg = "This field is required.";
    else if (q.minLen && v.length < q.minLen) msg = `Give a bit more detail (min ${q.minLen} chars).`;
    else if (q.type === "url" && v && !/^https?:\/\//i.test(v)) msg = "Must start with http(s)://";
    setRqErr(q.key, msg);
    if (msg) ok = false;
  });
  if (!ok) toast("Answer all role questions ⭐", "error");
  else saveDraft();
  return ok;
}

/* ============================================================
   Review (Step 4)
   ============================================================ */
function reviewRow(dt, dd) {
  if (!dd) return "";
  return `<div class="review-sec"><dl><dt>${escapeHtml(dt)}</dt><dd>${escapeHtml(dd)}</dd></dl></div>`;
}

function renderReview() {
  const u = collectUniversalFromDOM();
  state.universal = u;
  const box = $("#review-box");
  const rq = ROLE_QUESTIONS[state.role] || [];
  const rqRows = rq.map((q) =>
    `<dl><dt>${escapeHtml(q.label)}</dt><dd>${escapeHtml(state.roleAnswers[q.key] || "—")}</dd></dl>`).join("");
  box.innerHTML = `
    <div class="review-sec"><h4>🎯 Role — ${escapeHtml(state.role)}</h4></div>
    ${reviewRow("Name", u.fullName)}${reviewRow("Email", u.email)}
    ${reviewRow("Discord", u.discord)}${reviewRow("Roblox", `${u.robloxUsername} — ${u.robloxLink}`)}
    ${reviewRow("Age", u.age || "—")}${reviewRow("Country", u.country)}
    ${reviewRow("Timezone", u.timezone)}${reviewRow("Hours/week", u.hoursPerWeek)}
    ${reviewRow("Compensation", u.compensation)}${reviewRow("Portfolio", u.portfolio || "—")}
    ${reviewRow("Why join", u.whyJoin)}${reviewRow("Standout", u.standout)}
    <div class="review-sec"><h4>📋 ${escapeHtml(state.role)} answers</h4>${rqRows}</div>`;
}

/* ============================================================
   Submit
   ============================================================ */
async function handleSubmit(e) {
  e.preventDefault();
  if (!validateStep1() || !validateStep2() || !validateStep3()) {
    // jump back to first invalid step
    if (!state.role) gotoStep(1, true);
    else if (!validateStep2()) gotoStep(2, true);
    else gotoStep(3, true);
    return;
  }
  const btn = $("#submit-btn");
  const label = btn.querySelector(".btn-label");
  const spinner = btn.querySelector(".spinner");
  btn.disabled = true;
  label.textContent = "Submitting…";
  spinner.hidden = false;

  const u = collectUniversalFromDOM();
  const payload = {
    role: state.role,
    fullName: u.fullName, email: u.email, discord: u.discord,
    robloxUsername: u.robloxUsername, robloxLink: u.robloxLink, age: u.age,
    country: u.country, timezone: u.timezone, hoursPerWeek: u.hoursPerWeek,
    portfolio: u.portfolio, whyJoin: u.whyJoin, standout: u.standout,
    compensation: u.compensation, agreeNDA: true,
    roleAnswers: state.roleAnswers,
  };

  try {
    const res = await fetch("/api/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      const msg = data.errors ? data.errors.join(" ") : (data.error || "Submission failed. Try again.");
      throw new Error(msg);
    }
    showSuccess(payload, data.id);
    toast("Application submitted! 🎉", "ok");
  } catch (err) {
    toast(err.message || "Network error. Try again.", "error");
  } finally {
    btn.disabled = false;
    label.textContent = "Submit application ⚔️";
    spinner.hidden = true;
  }
}

function showSuccess(payload, id) {
  $("#apply-form").hidden = true;
  const s = $("#success-screen");
  s.hidden = false;
  $("#success-name").textContent = payload.fullName.split(" ")[0] || "friend";
  $("#success-role").textContent = payload.role;
  $("#success-id").textContent = id || "—";
  $("#discord-invite").href = DISCORD_INVITE;
  launchConfetti();
  clearDraft();
  s.scrollIntoView({ behavior: "smooth", block: "center" });
}

/* ============================================================
   Confetti (tiny canvas particles, no libs)
   ============================================================ */
function launchConfetti() {
  const canvas = $("#confetti");
  canvas.hidden = false;
  const ctx = canvas.getContext("2d");
  canvas.width = innerWidth; canvas.height = innerHeight;
  const colors = ["#ffd700", "#ffffff", "#ff6b6b", "#51cf66", "#748ffc"];
  const parts = Array.from({ length: 140 }, () => ({
    x: Math.random() * canvas.width, y: -20 - Math.random() * canvas.height * 0.3,
    w: 6 + Math.random() * 6, h: 8 + Math.random() * 8,
    c: colors[Math.floor(Math.random() * colors.length)],
    vy: 2 + Math.random() * 3, vx: -1.5 + Math.random() * 3, r: Math.random() * Math.PI,
    vr: -0.1 + Math.random() * 0.2,
  }));
  let frames = 0;
  (function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    parts.forEach((p) => {
      p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
      ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });
    if (++frames < 220) requestAnimationFrame(tick);
    else { canvas.hidden = true; ctx.clearRect(0, 0, canvas.width, canvas.height); }
  })();
  window.addEventListener("resize", () => { canvas.width = innerWidth; canvas.height = innerHeight; }, { once: true });
}

/* ============================================================
   Init
   ============================================================ */
function init() {
  initTilt();
  renderRolePicker();
  renderRoleSpecific();
  initCounters();
  loadDraft();

  // Role card Apply buttons → pre-select + scroll to form
  $$("[data-apply]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      setRole(btn.dataset.apply);
      gotoStep(1, true);
      $("#apply").scrollIntoView({ behavior: "smooth" });
      toast(`${btn.dataset.apply} selected — hit Continue ⚔️`, "ok");
    });
  });

  // Whole card click also selects (button handles apply)
  $$(".role-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      if (e.target.closest("button")) return;
      setRole(card.dataset.role);
    });
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setRole(card.dataset.role); }
    });
  });

  // Step nav
  $$("[data-next]").forEach((b) => b.addEventListener("click", () => {
    const next = Number(b.dataset.next);
    if (next === 2 && !validateStep1()) return;
    if (next === 3 && !validateStep2()) return;
    if (next === 4 && !validateStep3()) return;
    gotoStep(next);
  }));
  $$("[data-back]").forEach((b) => b.addEventListener("click", () => gotoStep(Number(b.dataset.back))));

  // Autosave on any input
  $("#apply-form").addEventListener("input", () => {
    $$("#role-specific [data-rq]").forEach((el) => { state.roleAnswers[el.dataset.rq] = el.value; });
    saveDraft();
  });

  $("#apply-form").addEventListener("submit", handleSubmit);

  $("#apply-again").addEventListener("click", () => {
    $("#success-screen").hidden = true;
    $("#apply-form").hidden = false;
    $("#apply-form").reset();
    state.role = ""; state.roleAnswers = {}; state.universal = {};
    renderRolePicker(); renderRoleSpecific(); gotoStep(1, true);
  });

  // Cube reacts subtly to mouse (desktop delight, cheap)
  const cube = $("#hero-cube");
  if (cube && window.matchMedia("(pointer: fine)").matches) {
    document.querySelector(".hero-visual")?.addEventListener("mousemove", (e) => {
      const r = e.currentTarget.getBoundingClientRect();
      const dx = (e.clientX - r.left) / r.width - 0.5;
      cube.style.animationPlayState = "paused";
      cube.style.transform = `rotateX(${-18 + -dy0(e, r)}deg) rotateY(${24 + dx * 60}deg)`;
    });
    document.querySelector(".hero-visual")?.addEventListener("mouseleave", () => {
      cube.style.transform = ""; cube.style.animationPlayState = "running";
    });
  }
  function dy0(e, r) { return ((e.clientY - r.top) / r.height - 0.5) * 30; }
}

/* ---------- Scroll reveal: fade + rise, staggered, motion-safe ---------- */
(function initReveal(){
  var els = Array.prototype.slice.call(document.querySelectorAll(".role-card,.req-card,.faq,.founder-card,.form-shell,.hero-copy > *"));
  function showAll(){ els.forEach(function (el) { el.classList.add("in"); }); }
  if (!("IntersectionObserver" in window)) { showAll(); return; }
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) { showAll(); return; }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
    });
  }, { threshold: 0.1, rootMargin: "0px 0px -6% 0px" });
  els.forEach(function (el, i) {
    el.classList.add("reveal");
    el.style.transitionDelay = ((i % 8) * 55) + "ms";
    io.observe(el);
  });
})();

/* ---------- Full-page cursor: ember glow + magnetic buttons ---------- */
(function initCursor(){
  if (!window.matchMedia || !window.matchMedia("(pointer: fine)").matches) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var glow = document.createElement("div");
  glow.id = "cursor-glow";
  glow.setAttribute("aria-hidden", "true");
  document.body.appendChild(glow);
  var gx = window.innerWidth / 2, gy = 200, tx = gx, ty = gy, raf = null;
  function loop(){
    gx += (tx - gx) * 0.08;
    gy += (ty - gy) * 0.08;
    glow.style.transform = "translate(" + gx + "px," + gy + "px)";
    if (Math.abs(tx - gx) > 0.5 || Math.abs(ty - gy) > 0.5) { raf = requestAnimationFrame(loop); }
    else { raf = null; }
  }
  document.addEventListener("mousemove", function (e) {
    tx = e.clientX; ty = e.clientY;
    if (!raf) raf = requestAnimationFrame(loop);
  }, { passive: true });
  /* primary buttons lean gently toward the cursor */
  var mags = Array.prototype.slice.call(document.querySelectorAll(".hero-actions .btn, .form-nav .btn-gold"));
  mags.forEach(function (btn) {
    var mraf = null;
    btn.addEventListener("mousemove", function (e) {
      var r = btn.getBoundingClientRect();
      var dx = e.clientX - (r.left + r.width / 2);
      var dy = e.clientY - (r.top + r.height / 2);
      if (mraf) cancelAnimationFrame(mraf);
      mraf = requestAnimationFrame(function () {
        btn.style.transform = "translate(" + (dx * 0.12).toFixed(1) + "px," + (dy * 0.18).toFixed(1) + "px)";
      });
    });
    btn.addEventListener("mouseleave", function () {
      if (mraf) cancelAnimationFrame(mraf);
      btn.style.transform = "";
    });
  });
})();

document.addEventListener("DOMContentLoaded", init);
