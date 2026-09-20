/* ============================================================
   SARTHAK'S STUDIO — TEAM HUB  admin.js
   Admin dashboard: login, list, filter, review, moderate, CSV
   Vanilla JS only.
   ============================================================ */
"use strict";

const PW_KEY = "ef_admin_pw";
const $ = (s, r = document) => r.querySelector(s);

let apps = [];
let currentId = null;

const getPw = () => sessionStorage.getItem(PW_KEY) || "";
const authHeaders = () => ({ "Content-Type": "application/json", "x-admin-password": getPw() });

/* ---------- Toast ---------- */
function toast(msg, kind = "") {
  const el = document.createElement("div");
  el.className = `toast ${kind}`;
  el.textContent = msg;
  $("#toast-wrap").appendChild(el);
  setTimeout(() => { el.style.opacity = "0"; el.style.transition = "opacity .4s"; }, 3200);
  setTimeout(() => el.remove(), 3700);
}

const esc = (v) => String(v ?? "—")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const fmtDate = (iso) => {
  try { return new Date(iso).toLocaleString(); } catch { return iso || "—"; }
};

/* ---------- Auth ---------- */
async function login(password) {
  let res;
  try {
    res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
  } catch {
    // Most common cause: server isn't running, or admin.html opened as file://
    throw new Error("Can't reach the server. Run `npm run dev` and open http://localhost:3000/admin.html (not file://).");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new Error(data.error || "Invalid password.");
}

function showDashboard(show) {
  $("#login-overlay").hidden = show;
  $("#dashboard").hidden = !show;
}

/* ---------- Data ---------- */
async function loadApps() {
  const res = await fetch("/api/applications", { headers: authHeaders() });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    sessionStorage.removeItem(PW_KEY);
    showDashboard(false);
    throw new Error("Session expired — log in again.");
  }
  if (!res.ok || !data.ok) throw new Error(data.error || "Failed to load applications.");
  apps = data.applications || [];
  renderTable();
}

async function setStatus(id, status) {
  const res = await fetch(`/api/applications/${encodeURIComponent(id)}`, {
    method: "PATCH", headers: authHeaders(), body: JSON.stringify({ status }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new Error(data.error || "Update failed.");
  const i = apps.findIndex((a) => a.id === id);
  if (i > -1) apps[i] = data.application;
  renderTable();
  if (currentId === id) openDetail(id); // refresh modal
  toast(`Marked as ${status} ✅`, "ok");
}

async function deleteApp(id) {
  const res = await fetch(`/api/applications/${encodeURIComponent(id)}`, {
    method: "DELETE", headers: authHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new Error(data.error || "Delete failed.");
  apps = apps.filter((a) => a.id !== id);
  renderTable();
  closeDetail();
  toast("Application deleted 🗑", "ok");
}

/* ---------- Rendering ---------- */
function filteredApps() {
  const role = $("#filter-role").value;
  const status = $("#filter-status").value;
  const q = $("#filter-search").value.trim().toLowerCase();
  return apps.filter((a) => {
    if (role && a.role !== role) return false;
    if (status && a.status !== status) return false;
    if (q && ![a.fullName, a.discord, a.email, a.robloxUsername].some(
      (v) => String(v || "").toLowerCase().includes(q))) return false;
    return true;
  });
}

function updateBadges() {
  const c = (s) => apps.filter((a) => a.status === s).length;
  $("#badge-total").textContent = `${apps.length} total`;
  $("#badge-pending").textContent = `${c("pending")} pending`;
  $("#badge-accepted").textContent = `${c("accepted")} accepted`;
  $("#badge-rejected").textContent = `${c("rejected")} rejected`;
}

function renderTable() {
  updateBadges();
  const rows = filteredApps();
  const body = $("#apps-body");
  body.innerHTML = "";
  $("#apps-empty").hidden = rows.length !== 0;
  rows.forEach((a) => {
    const tr = document.createElement("tr");
    tr.className = "row";
    tr.innerHTML = `
      <td><strong>${esc(a.fullName)}</strong><br><span class="muted">@${esc(a.robloxUsername)}</span></td>
      <td>${esc(a.role)}</td>
      <td>${esc(a.email)}</td>
      <td>${esc(a.discord)}</td>
      <td style="white-space:nowrap">${esc(fmtDate(a.createdAt))}</td>
      <td><span class="status ${esc(a.status)}">${esc(a.status)}</span></td>
      <td><div class="row-actions">
        <button class="mini" data-act="view">View</button>
        <button class="mini ok" data-act="accept">✔</button>
        <button class="mini bad" data-act="reject">✖</button>
        <button class="mini" data-act="del">🗑</button>
      </div></td>`;
    tr.addEventListener("click", (e) => {
      const act = e.target.closest("[data-act]")?.dataset.act;
      if (act === "accept") { e.stopPropagation(); setStatus(a.id, "accepted").catch((er) => toast(er.message, "error")); }
      else if (act === "reject") { e.stopPropagation(); setStatus(a.id, "rejected").catch((er) => toast(er.message, "error")); }
      else if (act === "del") {
        e.stopPropagation();
        if (confirm(`Delete application from ${a.fullName}?`)) deleteApp(a.id).catch((er) => toast(er.message, "error"));
      }
      else openDetail(a.id);
    });
    body.appendChild(tr);
  });
}

function openDetail(id) {
  const a = apps.find((x) => x.id === id);
  if (!a) return;
  currentId = id;
  $("#detail-title").textContent = `${a.fullName} — ${a.role}`;
  const rq = a.roleAnswers && typeof a.roleAnswers === "object"
    ? Object.entries(a.roleAnswers).map(([k, v]) =>
      `<dt>${esc(prettyKey(k))}</dt><dd>${esc(v)}</dd>`).join("")
    : "";
  $("#detail-body").innerHTML = `<dl>
    <dt>Status</dt><dd><span class="status ${esc(a.status)}">${esc(a.status)}</span></dd>
    <dt>Email</dt><dd>${esc(a.email)}</dd>
    <dt>Discord</dt><dd>${esc(a.discord)}</dd>
    <dt>Roblox</dt><dd>${esc(a.robloxUsername)} — ${esc(a.robloxLink)}</dd>
    <dt>Age</dt><dd>${esc(a.age)}</dd>
    <dt>Country</dt><dd>${esc(a.country)}</dd>
    <dt>Timezone</dt><dd>${esc(a.timezone)}</dd>
    <dt>Hours/week</dt><dd>${esc(a.hoursPerWeek)}</dd>
    <dt>Compensation</dt><dd>${esc(a.compensation)}</dd>
    <dt>Portfolio</dt><dd>${esc(a.portfolio)}</dd>
    <dt>Why join</dt><dd>${esc(a.whyJoin)}</dd>
    <dt>Standout</dt><dd>${esc(a.standout)}</dd>
    <dt>Submitted</dt><dd>${esc(fmtDate(a.createdAt))} · IP ${esc(a.ip)}</dd>
    ${rq}
  </dl>`;
  $("#detail-modal").hidden = false;
}

function prettyKey(k) {
  return k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}

function closeDetail() {
  currentId = null;
  $("#detail-modal").hidden = true;
}

/* ---------- CSV export ---------- */
function exportCSV() {
  if (apps.length === 0) { toast("Nothing to export.", "error"); return; }
  const cols = ["id", "role", "status", "fullName", "email", "discord",
    "robloxUsername", "robloxLink", "age", "country", "timezone",
    "hoursPerWeek", "compensation", "portfolio", "whyJoin", "standout", "createdAt"];
  const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [cols.join(",")];
  filteredApps().forEach((a) => lines.push(cols.map((c) => q(a[c])).join(",")));
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `sarthaks-studio-applications-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  toast(`Exported ${filteredApps().length} rows ⬇`, "ok");
}

/* ---------- Init ---------- */
function init() {
  // Restore session
  if (getPw()) {
    showDashboard(true);
    loadApps().catch((e) => { showDashboard(false); toast(e.message, "error"); });
  }

  const tryLogin = async () => {
    const pw = $("#admin-pass").value;
    $("#login-err").textContent = "";
    $("#login-btn").disabled = true;
    try {
      await login(pw);
      sessionStorage.setItem(PW_KEY, pw);
      $("#admin-pass").value = "";
      showDashboard(true);
      await loadApps();
      toast("Welcome back, Commander 👑", "ok");
    } catch (e) {
      $("#login-err").textContent = e.message;
    } finally {
      $("#login-btn").disabled = false;
    }
  };

  $("#login-btn").addEventListener("click", tryLogin);
  $("#admin-pass").addEventListener("keydown", (e) => { if (e.key === "Enter") tryLogin(); });

  ["filter-role", "filter-status"].forEach((id) =>
    $(`#${id}`).addEventListener("change", renderTable));
  $("#filter-search").addEventListener("input", renderTable);

  $("#refresh-btn").addEventListener("click", () =>
    loadApps().then(() => toast("Refreshed ↻", "ok")).catch((e) => toast(e.message, "error")));
  $("#export-btn").addEventListener("click", exportCSV);
  $("#logout-btn").addEventListener("click", () => {
    sessionStorage.removeItem(PW_KEY);
    apps = [];
    showDashboard(false);
    toast("Logged out.");
  });

  $("#detail-close").addEventListener("click", closeDetail);
  $("#detail-modal").addEventListener("click", (e) => { if (e.target.id === "detail-modal") closeDetail(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeDetail(); });
  $("#detail-accept").addEventListener("click", () =>
    setStatus(currentId, "accepted").catch((e) => toast(e.message, "error")));
  $("#detail-reject").addEventListener("click", () =>
    setStatus(currentId, "rejected").catch((e) => toast(e.message, "error")));
  $("#detail-delete").addEventListener("click", () => {
    if (confirm("Permanently delete this application?")) deleteApp(currentId).catch((e) => toast(e.message, "error"));
  });

  $("#admin-pass").focus();
}

document.addEventListener("DOMContentLoaded", init);
