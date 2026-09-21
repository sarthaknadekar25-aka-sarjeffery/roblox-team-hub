/* ============================================================
   SARTHAK'S STUDIO — TEAM HUB  app.js  (v2 fresh build)
   Multi-step application · autosave · validation · motion.
   Vanilla JS, no frameworks.
   ============================================================ */
"use strict";

/* ---------- Constants ---------- */
var DRAFT_KEY = "sarthaks-studio-draft-v2";
var DISCORD_INVITE = "https://discord.gg/empireforge";
var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

var ROLE_META = {
  "Scripter":    { icon: "📜", tag: "Luau • Systems" },
  "Builder":     { icon: "🧱", tag: "Worlds • Terrain" },
  "UI Designer": { icon: "🎨", tag: "Figma • HUD" },
  "Modeler":     { icon: "🗿", tag: "Blender • Props" },
  "Animator":    { icon: "🎬", tag: "Moon Animator" },
  "Composer":    { icon: "🎵", tag: "Music • SFX" },
  "Manager":     { icon: "👑", tag: "Community" },
  "Tester":      { icon: "🐞", tag: "QA • All devices" }
};

var ROLE_QUESTIONS = {
  "Scripter": [
    { key: "luauYears", label: "Years of Luau experience?", type: "select", options: ["< 1 year", "1–2 years", "3–4 years", "5+ years"], required: true },
    { key: "github", label: "GitHub / code portfolio link (optional)", type: "url", placeholder: "https://github.com/you/…", required: false },
    { key: "profileService", label: "Have you used ProfileService / DataStoreService?", type: "select", options: ["Yes — shipped with it", "Yes — experimented", "No — willing to learn"], required: true },
    { key: "systemDesc", label: "Describe a game system you built (~100 words)", type: "textarea", placeholder: "e.g. a sword combat system with combos, hitboxes, cooldowns…", required: true, minLen: 50 },
    { key: "hours10", label: "Can you commit 10 hrs/week?", type: "select", options: ["Yes", "No — but 5+ hrs", "No"], required: true },
    { key: "availability", label: "Timezone & best hours to collaborate", type: "text", placeholder: "e.g. IST evenings 7–10pm", required: true }
  ],
  "Builder": [
    { key: "portfolioBuild", label: "Build portfolio link", type: "url", placeholder: "Roblox / Imgur / Drive link…", required: true },
    { key: "style", label: "Preferred build style?", type: "select", options: ["Low-poly", "Realistic", "Stylized", "Mixed"], required: true },
    { key: "terrainEditor", label: "Can you use the Terrain Editor?", type: "select", options: ["Yes — expert", "Yes — basics", "No"], required: true },
    { key: "exampleMap", label: "Describe your best map (theme, size, tricks used)", type: "textarea", placeholder: "e.g. a 2048×2048 castle island with…", required: true, minLen: 30 },
    { key: "deadlines", label: "Can you hit weekly build deadlines?", type: "select", options: ["Yes", "Usually", "No"], required: true }
  ],
  "UI Designer": [
    { key: "portfolioUI", label: "UI portfolio link", type: "url", placeholder: "Figma / Dribbble / Drive…", required: true },
    { key: "tools", label: "Design tools you use?", type: "select", options: ["Figma", "Photoshop", "Figma + Photoshop", "Other"], required: true },
    { key: "mobileFirst", label: "Do you design mobile-first?", type: "select", options: ["Yes — always", "Sometimes", "No — desktop first"], required: true },
    { key: "examples", label: "Describe 2 UI pieces you're proud of", type: "textarea", placeholder: "e.g. an inventory HUD with… + a mobile shop…", required: true, minLen: 30 },
    { key: "constraints", label: "What Roblox UI constraints do you design around?", type: "textarea", placeholder: "e.g. safe-area, TextScaled, 9-slice, small screens…", required: true, minLen: 20 }
  ],
  "Modeler": [
    { key: "software", label: "Modelling software?", type: "select", options: ["Blender", "Maya", "3ds Max", "Other"], required: true },
    { key: "portfolioModel", label: "Model portfolio link", type: "url", placeholder: "ArtStation / Sketchfab / Drive…", required: true },
    { key: "lowPoly", label: "Can you optimise under 10k tris for mobile?", type: "select", options: ["Yes", "With guidance", "No"], required: true },
    { key: "pbr", label: "Do you work with PBR textures?", type: "select", options: ["Yes", "Somewhat", "No"], required: true },
    { key: "triExample", label: "Example: how did you cut tris on a past model?", type: "textarea", placeholder: "e.g. merged verts, baked normals…", required: true, minLen: 20 }
  ],
  "Animator": [
    { key: "portfolioAnim", label: "Animation portfolio link", type: "url", placeholder: "YouTube / Drive with your clips…", required: true },
    { key: "toolsAnim", label: "Animation tools?", type: "text", placeholder: "e.g. Moon Animator + Blender", required: true },
    { key: "rigging", label: "Can you rig custom characters?", type: "select", options: ["Yes", "Basic rigs", "No"], required: true },
    { key: "demoLink", label: "Walk + idle demo link", type: "url", placeholder: "https://…", required: true },
    { key: "rigType", label: "Which rigs have you animated?", type: "select", options: ["R15", "R6", "R15 + R6", "Custom"], required: true }
  ],
  "Composer": [
    { key: "portfolioMusic", label: "Music portfolio (SoundCloud / Drive)", type: "url", placeholder: "https://soundcloud.com/you/…", required: true },
    { key: "daw", label: "Your DAW?", type: "text", placeholder: "e.g. FL Studio, Ableton, BandLab", required: true },
    { key: "loops", label: "Can you deliver seamless loops + battle stingers?", type: "select", options: ["Yes — both", "Loops only", "Stingers only", "No"], required: true },
    { key: "royaltyFree", label: "OK with 100% original, royalty-free delivery?", type: "select", options: ["Yes", "Need to discuss", "No"], required: true },
    { key: "trackDesc", label: "Describe one track that fits a medieval siege", type: "textarea", placeholder: "Tempo, instruments, mood…", required: true, minLen: 20 }
  ],
  "Manager": [
    { key: "discordExp", label: "Discord moderation / management experience?", type: "textarea", placeholder: "Servers managed, member counts, bots used…", required: true, minLen: 20 },
    { key: "ageConfirm", label: "Are you 16 or older?", type: "select", options: ["Yes — 16+", "No — under 16"], required: true },
    { key: "hoursDay", label: "Hours per day you can moderate?", type: "select", options: ["1–2", "3–4", "5+"], required: true },
    { key: "toxicHandling", label: "How would you handle a toxic player spamming chat?", type: "textarea", placeholder: "Warn → mute → … appeal process…", required: true, minLen: 30 },
    { key: "whyManager", label: "Why do you want this role?", type: "textarea", placeholder: "…", required: true, minLen: 20 }
  ],
  "Tester": [
    { key: "devices", label: "Devices you can test on? (list all)", type: "text", placeholder: "e.g. Windows PC + Android phone + Xbox", required: true },
    { key: "bugExp", label: "Have you filed bug reports before?", type: "select", options: ["Yes — many", "A few", "Never — willing to learn"], required: true },
    { key: "reproSteps", label: "Write reproduction steps for a sample bug", type: "textarea", placeholder: "1. Join… 2. Equip sword… 3. Observe… Expected vs actual…", required: true, minLen: 30 },
    { key: "hoursTest", label: "Hours per week for testing?", type: "select", options: ["1–4", "5–9", "10–15", "16+"], required: true }
  ]
};

/* ---------- State ---------- */
var state = { step: 1, role: "", universal: {}, roleAnswers: {} };

function $(sel, root) { return (root || document).querySelector(sel); }
function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

/* ---------- Toast ---------- */
function toast(msg, kind) {
  var wrap = $("#toast-wrap");
  var el = document.createElement("div");
  el.className = "toast " + (kind || "");
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(function () { el.style.opacity = "0"; el.style.transition = "opacity .4s"; }, 3400);
  setTimeout(function () { el.remove(); }, 3900);
}

/* ---------- 3D tilt (role + requirement cards, fine pointers only) ---------- */
function initTilt() {
  if (!window.matchMedia || !window.matchMedia("(pointer: fine)").matches) return;
  $all(".role-card, .req-card").forEach(function (card) {
    var raf = null;
    card.addEventListener("mousemove", function (e) {
      var r = card.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5;
      var py = (e.clientY - r.top) / r.height - 0.5;
      card.style.setProperty("--mx", ((px + 0.5) * 100) + "%");
      card.style.setProperty("--my", ((py + 0.5) * 100) + "%");
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(function () {
        card.style.transform =
          "perspective(800px) rotateX(" + (-py * 10).toFixed(2) + "deg) rotateY(" + (px * 12).toFixed(2) + "deg) translateZ(4px)";
      });
    });
    card.addEventListener("mouseleave", function () {
      if (raf) cancelAnimationFrame(raf);
      card.style.transform = "perspective(800px) rotateX(0deg) rotateY(0deg)";
    });
  });
}

/* ---------- Full-page cursor: ember glow + magnetic buttons ---------- */
function initCursor() {
  if (!window.matchMedia || !window.matchMedia("(pointer: fine)").matches) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var glow = document.createElement("div");
  glow.id = "cursor-glow";
  glow.setAttribute("aria-hidden", "true");
  document.body.appendChild(glow);
  var gx = window.innerWidth / 2, gy = 200, tx = gx, ty = gy, raf = null;
  function loop() {
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
  $all(".hero-actions .btn, .form-nav .btn-fire").forEach(function (btn) {
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
}

/* ---------- Scroll reveal ---------- */
function initReveal() {
  var els = $all(".role-card,.req-card,.faq,.founder-card,.form-shell,.hero-copy > *");
  function showAll() { els.forEach(function (el) { el.classList.add("in"); }); }
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
}

/* ---------- Role picker (Step 1) ---------- */
function renderRolePicker() {
  var picker = $("#role-picker");
  picker.innerHTML = "";
  Object.keys(ROLE_QUESTIONS).forEach(function (role) {
    var meta = ROLE_META[role] || { icon: "⭐", tag: role };
    var b = document.createElement("button");
    b.type = "button";
    b.className = "picker-card";
    b.setAttribute("role", "radio");
    b.setAttribute("data-role", role);
    b.setAttribute("aria-checked", state.role === role ? "true" : "false");
    b.innerHTML = '<div style="font-size:1.6rem">' + meta.icon + "</div>" + role + "<small>" + meta.tag + "</small>";
    b.addEventListener("click", function () { setRole(role); });
    picker.appendChild(b);
  });
}

function setRole(role) {
  state.role = role;
  state.roleAnswers = {};
  $all("#role-picker .picker-card").forEach(function (c) {
    c.setAttribute("aria-checked", c.getAttribute("data-role") === role ? "true" : "false");
  });
  $all(".role-card").forEach(function (c) {
    c.classList.toggle("selected", c.getAttribute("data-role") === role);
  });
  $("#err-role").textContent = "";
  renderRoleSpecific();
  saveDraft();
}

/* ---------- Role-specific questions (Step 3) ---------- */
function escHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
  });
}
function escAttr(s) { return String(s == null ? "" : s).replace(/["<>]/g, ""); }

function renderRoleSpecific() {
  var box = $("#role-specific");
  $("#roleq-title").textContent = state.role || "Role";
  box.innerHTML = "";
  if (!state.role || !ROLE_QUESTIONS[state.role]) {
    box.innerHTML = '<p class="sub">Pick a role in Step 1 first.</p>';
    return;
  }
  ROLE_QUESTIONS[state.role].forEach(function (q) {
    var wrap = document.createElement("div");
    wrap.className = "field" + (q.type === "textarea" ? " field-full" : "");
    var id = "rq-" + q.key;
    var saved = state.roleAnswers[q.key] || "";
    var control;
    if (q.type === "select") {
      control = '<select id="' + id + '" data-rq="' + q.key + '"><option value="">Select…</option>' +
        q.options.map(function (o) { return "<option" + (o === saved ? " selected" : "") + ">" + escHtml(o) + "</option>"; }).join("") +
        "</select>";
    } else if (q.type === "textarea") {
      control = '<textarea id="' + id + '" data-rq="' + q.key + '" rows="3" placeholder="' + escAttr(q.placeholder || "") + '">' + escHtml(saved) + "</textarea>";
    } else {
      var itype = q.type === "url" ? "url" : "text";
      control = '<input id="' + id + '" data-rq="' + q.key + '" type="' + itype + '" value="' + escAttr(saved) + '" placeholder="' + escAttr(q.placeholder || "") + '" />';
    }
    wrap.innerHTML = "<label for=\"" + id + "\">" + escHtml(q.label) + (q.required ? " *" : "") + "</label>" + control +
      '<p class="field-error" data-err-rq="' + q.key + '"></p>';
    box.appendChild(wrap);
  });
  $all("#role-specific [data-rq]").forEach(function (el) {
    el.addEventListener("input", function () {
      state.roleAnswers[el.getAttribute("data-rq")] = el.value;
      saveDraft();
    });
  });
}

/* ---------- Character counters ---------- */
function initCounters() {
  [["#f-whyJoin", "#count-whyJoin"], ["#f-standout", "#count-standout"]].forEach(function (pair) {
    var input = $(pair[0]), count = $(pair[1]);
    if (!input || !count) return;
    var update = function () { count.textContent = input.value.length + " / " + (input.maxLength || 1200); };
    input.addEventListener("input", update);
    update();
  });
}

/* ---------- Draft autosave (localStorage, offline-first) ---------- */
function collectUniversalFromDOM() {
  function get(id) { var el = $(id); return el ? el.value.trim() : ""; }
  return {
    fullName: get("#f-fullName"),
    email: get("#f-email"),
    discord: get("#f-discord"),
    robloxUsername: get("#f-robloxUsername"),
    robloxLink: get("#f-robloxLink"),
    age: get("#f-age"),
    country: get("#f-country"),
    timezone: get("#f-timezone"),
    hoursPerWeek: $("#f-hoursPerWeek") ? $("#f-hoursPerWeek").value : "",
    compensation: $("#f-compensation") ? $("#f-compensation").value : "",
    portfolio: get("#f-portfolio"),
    whyJoin: $("#f-whyJoin") ? $("#f-whyJoin").value : "",
    standout: $("#f-standout") ? $("#f-standout").value : "",
    agreeNDA: $("#f-agreeNDA") ? $("#f-agreeNDA").checked === true : false
  };
}

function fillUniversalToDOM(u) {
  u = u || {};
  function set(id, v) { var el = $(id); if (el && v !== undefined) el.value = v; }
  set("#f-fullName", u.fullName); set("#f-email", u.email); set("#f-discord", u.discord);
  set("#f-robloxUsername", u.robloxUsername); set("#f-robloxLink", u.robloxLink);
  set("#f-age", u.age); set("#f-country", u.country); set("#f-timezone", u.timezone);
  set("#f-hoursPerWeek", u.hoursPerWeek); set("#f-compensation", u.compensation);
  set("#f-portfolio", u.portfolio); set("#f-whyJoin", u.whyJoin); set("#f-standout", u.standout);
  if (u.agreeNDA && $("#f-agreeNDA")) $("#f-agreeNDA").checked = true;
}

function saveDraft() {
  state.universal = collectUniversalFromDOM();
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
      step: state.step, role: state.role, universal: state.universal, roleAnswers: state.roleAnswers
    }));
  } catch (e) { /* private mode — non-fatal */ }
}

function loadDraft() {
  try {
    var raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    var d = JSON.parse(raw);
    state.role = d.role || "";
    state.universal = d.universal || {};
    state.roleAnswers = d.roleAnswers || {};
    fillUniversalToDOM(state.universal);
    if (state.role) {
      renderRolePicker();
      $all("#role-picker .picker-card").forEach(function (c) {
        c.setAttribute("aria-checked", c.getAttribute("data-role") === state.role ? "true" : "false");
      });
      renderRoleSpecific();
      $all("#role-specific [data-rq]").forEach(function (el) {
        var k = el.getAttribute("data-rq");
        if (state.roleAnswers[k] !== undefined) el.value = state.roleAnswers[k];
      });
    }
    initCounters();
    if (d.step >= 1 && d.step <= 4) gotoStep(d.step, true);
  } catch (e) { /* corrupt draft — ignore */ }
}

function clearDraft() { try { localStorage.removeItem(DRAFT_KEY); } catch (e) {} }

/* ---------- Steps + validation ---------- */
function gotoStep(n, silent) {
  state.step = n;
  $all(".form-step").forEach(function (s) { s.classList.toggle("active", s.id === "step-" + n); });
  $all("#steps-bar .step").forEach(function (li) {
    var k = Number(li.getAttribute("data-step"));
    li.classList.toggle("active", k === n);
    li.classList.toggle("done", k < n);
  });
  $("#progress-fill").style.width = ((n / 4) * 100) + "%";
  if (n === 4) renderReview();
  if (!silent) {
    var apply = $("#apply");
    if (apply && apply.scrollIntoView) apply.scrollIntoView({ behavior: "smooth", block: "start" });
    saveDraft();
  }
}

function setErr(name, msg) { var el = $('[data-err="' + name + '"]'); if (el) el.textContent = msg || ""; }
function setRqErr(key, msg) { var el = $('[data-err-rq="' + key + '"]'); if (el) el.textContent = msg || ""; }

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
  var u = collectUniversalFromDOM();
  state.universal = u;
  var ok = true;
  function need(cond, name, msg) { setErr(name, cond ? "" : msg); if (!cond) ok = false; }
  need(u.fullName.length >= 2, "fullName", "Enter your full name.");
  need(u.email === "" || EMAIL_RE.test(u.email), "email", "Enter a valid email, or leave it blank.");
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
  var qs = ROLE_QUESTIONS[state.role] || [];
  var ok = true;
  $all("#role-specific [data-rq]").forEach(function (el) {
    state.roleAnswers[el.getAttribute("data-rq")] = el.value.trim();
  });
  qs.forEach(function (q) {
    var v = (state.roleAnswers[q.key] || "").trim();
    var msg = "";
    if (q.required && !v) msg = "This field is required.";
    else if (q.minLen && v.length < q.minLen) msg = "Give a bit more detail (min " + q.minLen + " chars).";
    else if (q.type === "url" && v && !/^https?:\/\//i.test(v)) msg = "Must start with http(s)://";
    setRqErr(q.key, msg);
    if (msg) ok = false;
  });
  if (!ok) toast("Answer all role questions ⭐", "error");
  else saveDraft();
  return ok;
}

/* ---------- Review ---------- */
function renderReview() {
  var u = collectUniversalFromDOM();
  state.universal = u;
  var rq = ROLE_QUESTIONS[state.role] || [];
  var html = '<div class="review-sec"><h4>🎯 Role — ' + escHtml(state.role) + "</h4></div>";
  [["Name", u.fullName], ["Email", u.email], ["Discord", u.discord],
   ["Roblox", u.robloxUsername + " — " + u.robloxLink], ["Age", u.age || "—"],
   ["Country", u.country], ["Timezone", u.timezone], ["Hours/week", u.hoursPerWeek],
   ["Compensation", u.compensation], ["Portfolio", u.portfolio || "—"],
   ["Why join", u.whyJoin], ["Standout", u.standout]
  ].forEach(function (pair) {
    if (!pair[1]) return;
    html += '<div class="review-sec"><dl><dt>' + escHtml(pair[0]) + "</dt><dd>" + escHtml(pair[1]) + "</dd></dl></div>";
  });
  html += '<div class="review-sec"><h4>📋 ' + escHtml(state.role) + " answers</h4>" +
    rq.map(function (q) {
      return "<dl><dt>" + escHtml(q.label) + "</dt><dd>" + escHtml(state.roleAnswers[q.key] || "—") + "</dd></dl>";
    }).join("") + "</div>";
  $("#review-box").innerHTML = html;
}

/* ---------- Submit ---------- */
function handleSubmit(e) {
  e.preventDefault();
  if (!validateStep1()) { gotoStep(1, true); return; }
  if (!validateStep2()) { gotoStep(2, true); return; }
  if (!validateStep3()) { gotoStep(3, true); return; }
  var btn = $("#submit-btn");
  var label = btn.querySelector(".btn-label");
  var spinner = btn.querySelector(".spinner");
  btn.disabled = true;
  label.textContent = "Submitting…";
  spinner.hidden = false;
  var u = collectUniversalFromDOM();
  var payload = {
    role: state.role,
    fullName: u.fullName, email: u.email, discord: u.discord,
    robloxUsername: u.robloxUsername, robloxLink: u.robloxLink, age: u.age,
    country: u.country, timezone: u.timezone, hoursPerWeek: u.hoursPerWeek,
    portfolio: u.portfolio, whyJoin: u.whyJoin, standout: u.standout,
    compensation: u.compensation, agreeNDA: true,
    roleAnswers: state.roleAnswers
  };
  fetch("/api/apply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }).then(function (res) {
    return res.json().catch(function () { return {}; }).then(function (data) {
      return { res: res, data: data };
    });
  }).then(function (out) {
    if (!out.res.ok || !out.data.ok) {
      var msg = out.data.errors ? out.data.errors.join(" ") : (out.data.error || "Submission failed. Try again.");
      throw new Error(msg);
    }
    showSuccess(payload, out.data.id);
    toast("Application submitted! 🎉", "ok");
  }).catch(function (err) {
    toast(err.message || "Network error. Try again.", "error");
  }).then(function () {
    btn.disabled = false;
    label.textContent = "Submit application ⚔️";
    spinner.hidden = true;
  });
}

function showSuccess(payload, id) {
  $("#apply-form").hidden = true;
  var s = $("#success-screen");
  s.hidden = false;
  $("#success-name").textContent = payload.fullName.split(" ")[0] || "friend";
  $("#success-role").textContent = payload.role;
  $("#success-id").textContent = id || "—";
  $("#discord-invite").href = DISCORD_INVITE;
  launchConfetti();
  clearDraft();
  if (s.scrollIntoView) s.scrollIntoView({ behavior: "smooth", block: "center" });
}

/* ---------- Confetti (tiny canvas particles, no libs) ---------- */
function launchConfetti() {
  var canvas = $("#confetti");
  canvas.hidden = false;
  var ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  var colors = ["#ff6a2b", "#c9a24b", "#ffffff", "#ff6b6b", "#51cf66"];
  var parts = [];
  for (var i = 0; i < 140; i++) {
    parts.push({
      x: Math.random() * canvas.width, y: -20 - Math.random() * canvas.height * 0.3,
      w: 6 + Math.random() * 6, h: 8 + Math.random() * 8,
      c: colors[Math.floor(Math.random() * colors.length)],
      vy: 2 + Math.random() * 3, vx: -1.5 + Math.random() * 3,
      r: Math.random() * Math.PI, vr: -0.1 + Math.random() * 0.2
    });
  }
  var frames = 0;
  (function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    parts.forEach(function (p) {
      p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
      ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });
    if (++frames < 220) requestAnimationFrame(tick);
    else { canvas.hidden = true; ctx.clearRect(0, 0, canvas.width, canvas.height); }
  })();
}

/* ---------- Live code panel: types Luau on loop ---------- */
var CODE_LINES = [
  [{ t: "-- ⚔ siege combat server", c: "tok-c" }],
  [{ t: "local ", c: "tok-k" }, { t: "Combat = {}", c: "tok-p" }],
  [{ t: "local ", c: "tok-k" }, { t: "DAMAGE = ", c: "tok-p" }, { t: "25", c: "tok-n" }],
  [],
  [{ t: "function ", c: "tok-k" }, { t: "Combat.swing", c: "tok-f" }, { t: "(player, target)", c: "tok-p" }],
  [{ t: "  local ", c: "tok-k" }, { t: "sword = player.Backpack:FindFirstChild(", c: "tok-p" }, { t: '"Sword"', c: "tok-s" }, { t: ")", c: "tok-p" }],
  [{ t: "  if not ", c: "tok-k" }, { t: "sword ", c: "tok-p" }, { t: "then return end", c: "tok-k" }],
  [{ t: "  target:TakeDamage(DAMAGE)", c: "tok-p" }],
  [{ t: "  game.Reverb.Steel:Play()", c: "tok-p" }],
  [{ t: "end", c: "tok-k" }],
  [],
  [{ t: "return ", c: "tok-k" }, { t: "Combat", c: "tok-p" }]
];

function lineText(line) {
  var s = "";
  for (var i = 0; i < line.length; i++) s += line[i].t;
  return s;
}

function typeCode() {
  var code = document.getElementById("ed-code");
  var gutter = document.getElementById("ed-gutter");
  var ln = document.getElementById("ed-ln");
  var caret = document.getElementById("ed-caret");
  if (!code || !gutter || !caret) return;
  var lineDivs = CODE_LINES.map(function (_, i) {
    var d = document.createElement("div");
    d.className = "ed-line";
    code.appendChild(d);
    var g = document.createElement("div");
    g.textContent = i + 1;
    gutter.appendChild(g);
    return d;
  });
  function paintAll() {
    CODE_LINES.forEach(function (line, idx) {
      lineDivs[idx].innerHTML = line.map(function (tok) {
        return '<span class="' + tok.c + '">' + escHtml(tok.t) + "</span>";
      }).join("");
    });
    caret.style.display = "none";
  }
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    paintAll();
    return;
  }
  function paintLine(idx, upto) {
    var line = CODE_LINES[idx], html = "", used = 0, k, tok, part;
    for (k = 0; k < line.length; k++) {
      tok = line[k];
      if (used + tok.t.length <= upto) { part = tok.t; used += tok.t.length; }
      else { part = tok.t.slice(0, upto - used); used = upto; }
      html += '<span class="' + tok.c + '">' + escHtml(part) + "</span>";
      if (used >= upto) break;
    }
    lineDivs[idx].innerHTML = html;
    lineDivs[idx].appendChild(caret);
    if (ln) ln.textContent = idx + 1;
  }
  var li = 0, ci = 0;
  function tick() {
    var len = lineText(CODE_LINES[li]).length;
    if (ci <= len) {
      paintLine(li, ci);
      ci++;
      setTimeout(tick, CODE_LINES[li].length === 0 ? 140 : 26);
    } else if (li < CODE_LINES.length - 1) {
      li++; ci = 0;
      setTimeout(tick, 220);
    } else {
      setTimeout(function () {
        lineDivs.forEach(function (d) { d.innerHTML = ""; });
        lineDivs[0].appendChild(caret);
        li = 0; ci = 0;
        if (ln) ln.textContent = 1;
        setTimeout(tick, 600);
      }, 3000);
    }
  }
  setTimeout(tick, 700);
}

/* ---------- Init ---------- */
function init() {
  initTilt();
  initCursor();
  initReveal();
  typeCode();
  renderRolePicker();
  renderRoleSpecific();
  initCounters();
  loadDraft();

  $all("[data-apply]").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      setRole(btn.getAttribute("data-apply"));
      gotoStep(1, true);
      var apply = $("#apply");
      if (apply && apply.scrollIntoView) apply.scrollIntoView({ behavior: "smooth" });
      toast(btn.getAttribute("data-apply") + " selected — hit Continue ⚔️", "ok");
    });
  });

  $all(".role-card").forEach(function (card) {
    card.addEventListener("click", function (e) {
      if (e.target.closest("button")) return;
      setRole(card.getAttribute("data-role"));
    });
    card.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setRole(card.getAttribute("data-role")); }
    });
  });

  $all("[data-next]").forEach(function (b) {
    b.addEventListener("click", function () {
      var next = Number(b.getAttribute("data-next"));
      if (next === 2 && !validateStep1()) return;
      if (next === 3 && !validateStep2()) return;
      if (next === 4 && !validateStep3()) return;
      gotoStep(next);
    });
  });
  $all("[data-back]").forEach(function (b) {
    b.addEventListener("click", function () { gotoStep(Number(b.getAttribute("data-back"))); });
  });

  $("#apply-form").addEventListener("input", function () {
    $all("#role-specific [data-rq]").forEach(function (el) {
      state.roleAnswers[el.getAttribute("data-rq")] = el.value;
    });
    saveDraft();
  });
  $("#apply-form").addEventListener("submit", handleSubmit);

  $("#apply-again").addEventListener("click", function () {
    $("#success-screen").hidden = true;
    $("#apply-form").hidden = false;
    $("#apply-form").reset();
    state.role = ""; state.roleAnswers = {}; state.universal = {};
    renderRolePicker(); renderRoleSpecific(); gotoStep(1, true);
  });

  var cube = $("#hero-cube");
  var visual = document.querySelector(".hero-visual");
  if (cube && visual && window.matchMedia && window.matchMedia("(pointer: fine)").matches) {
    visual.addEventListener("mousemove", function (e) {
      var r = visual.getBoundingClientRect();
      var dx = (e.clientX - r.left) / r.width - 0.5;
      var dy = (e.clientY - r.top) / r.height - 0.5;
      cube.style.animationPlayState = "paused";
      cube.style.transform = "rotateX(" + (-18 + dy * -30) + "deg) rotateY(" + (24 + dx * 60) + "deg)";
    });
    visual.addEventListener("mouseleave", function () {
      cube.style.transform = "";
      cube.style.animationPlayState = "running";
    });
  }
}

document.addEventListener("DOMContentLoaded", init);
