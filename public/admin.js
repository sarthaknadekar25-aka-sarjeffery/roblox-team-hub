"use strict";

var PW_KEY = "sarthaks-studio-admin";
var apps = [];
var currentId = null;

function $(s, r) { return (r || document).querySelector(s); }
function getPw() { try { return sessionStorage.getItem(PW_KEY) || ""; } catch (e) { return ""; } }
function authHeaders() { return { "Content-Type": "application/json", "x-admin-password": getPw() }; }

function toast(msg, kind) {
  var el = document.createElement("div");
  el.className = "toast " + (kind || "");
  el.textContent = msg;
  $("#toast-wrap").appendChild(el);
  setTimeout(function () { el.style.opacity = "0"; el.style.transition = "opacity .4s"; }, 3200);
  setTimeout(function () { el.remove(); }, 3700);
}

function esc(v) {
  return String(v == null ? "—" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function fmtDate(iso) {
  try { return new Date(iso).toLocaleString(); } catch (e) { return iso || "—"; }
}
function prettyKey(k) {
  return String(k).replace(/([A-Z])/g, " $1").replace(/^./, function (c) { return c.toUpperCase(); });
}

function login(password) {
  return fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: password })
  }).then(function (res) {
    return res.json().catch(function () { return {}; }).then(function (data) {
      if (!res.ok || !data.ok) throw new Error(data.error || "Invalid password.");
    });
  }).catch(function (err) {
    if (err.message === "Failed to fetch") {
      throw new Error("Can't reach the server. Open this page through the site URL (not as a file).");
    }
    throw err;
  });
}

function showDashboard(show) {
  $("#login-overlay").hidden = show;
  $("#dashboard").hidden = !show;
}

function loadApps() {
  return fetch("/api/applications", { headers: authHeaders() }).then(function (res) {
    return res.json().catch(function () { return {}; }).then(function (data) {
      if (res.status === 401) {
        try { sessionStorage.removeItem(PW_KEY); } catch (e) {}
        showDashboard(false);
        throw new Error("Session expired — log in again.");
      }
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to load applications.");
      apps = data.applications || [];
      renderTable();
    });
  });
}

function setStatus(id, status) {
  return fetch("/api/applications/" + encodeURIComponent(id), {
    method: "PATCH", headers: authHeaders(), body: JSON.stringify({ status: status })
  }).then(function (res) {
    return res.json().catch(function () { return {}; }).then(function (data) {
      if (!res.ok || !data.ok) throw new Error(data.error || "Update failed.");
      for (var i = 0; i < apps.length; i++) {
        if (apps[i].id === id) apps[i] = data.application;
      }
      renderTable();
      if (currentId === id) openDetail(id);
      var bits = [];
      if (data.notified && data.notified.dm) bits.push("DM sent");
      else if (data.notified && data.notified.discord) bits.push("Discord pinged");
      if (data.notified && data.notified.email) bits.push("email sent");
      var extra;
      if (bits.length > 0) {
        extra = " (" + bits.join(" + ") + " ✅)";
      } else {
        var hasEmail = false;
        for (var e = 0; e < apps.length; e++) {
          if (apps[e].id === id && apps[e].email) hasEmail = true;
        }
        extra = hasEmail ? " (notify failed ⚠️)" : " (no contact on file ⚠️)";
      }
      toast((status === "accepted" ? "Accepted" : "Rejected") + extra, bits.length > 0 ? "ok" : "");
    });
  }).catch(function (e) { toast(e.message, "error"); });
}

function deleteApp(id) {
  return fetch("/api/applications/" + encodeURIComponent(id), {
    method: "DELETE", headers: authHeaders()
  }).then(function (res) {
    return res.json().catch(function () { return {}; }).then(function (data) {
      if (!res.ok || !data.ok) throw new Error(data.error || "Delete failed.");
      apps = apps.filter(function (a) { return a.id !== id; });
      renderTable();
      closeDetail();
      toast("Application deleted 🗑", "ok");
    });
  }).catch(function (e) { toast(e.message, "error"); });
}

function filteredApps() {
  var role = $("#filter-role").value;
  var status = $("#filter-status").value;
  var q = $("#filter-search").value.trim().toLowerCase();
  return apps.filter(function (a) {
    if (role && a.role !== role) return false;
    if (status && a.status !== status) return false;
    if (q && ![a.fullName, a.discord, a.email, a.robloxUsername].some(function (v) {
      return String(v || "").toLowerCase().indexOf(q) !== -1;
    })) return false;
    return true;
  });
}

function updateBadges() {
  function c(s) { return apps.filter(function (a) { return a.status === s; }).length; }
  $("#badge-total").textContent = apps.length + " total";
  $("#badge-pending").textContent = c("pending") + " pending";
  $("#badge-accepted").textContent = c("accepted") + " accepted";
  $("#badge-rejected").textContent = c("rejected") + " rejected";
}

function renderTable() {
  updateBadges();
  var rows = filteredApps();
  var body = $("#apps-body");
  body.innerHTML = "";
  $("#apps-empty").hidden = rows.length !== 0;
  rows.forEach(function (a) {
    var tr = document.createElement("tr");
    tr.className = "row";
    tr.innerHTML =
      "<td><strong>" + esc(a.fullName) + "</strong><br><span class=\"muted\">@" + esc(a.robloxUsername) + "</span></td>" +
      "<td>" + esc(a.role) + "</td><td>" + esc(a.email) + "</td><td>" + esc(a.discord) + "</td>" +
      "<td style=\"white-space:nowrap\">" + esc(fmtDate(a.createdAt)) + "</td>" +
      "<td><span class=\"status " + esc(a.status) + "\">" + esc(a.status) + "</span></td>" +
      "<td><div class=\"row-actions\">" +
      "<button class=\"mini\" data-act=\"view\">View</button>" +
      "<button class=\"mini ok\" data-act=\"accept\">✔</button>" +
      "<button class=\"mini bad\" data-act=\"reject\">✖</button>" +
      "<button class=\"mini\" data-act=\"del\">🗑</button></div></td>";
    tr.addEventListener("click", function (e) {
      var btn = e.target.closest ? e.target.closest("[data-act]") : null;
      var act = btn ? btn.getAttribute("data-act") : null;
      if (act === "accept") { e.stopPropagation(); setStatus(a.id, "accepted"); }
      else if (act === "reject") { e.stopPropagation(); setStatus(a.id, "rejected"); }
      else if (act === "del") {
        e.stopPropagation();
        if (confirm("Delete application from " + a.fullName + "?")) deleteApp(a.id);
      }
      else openDetail(a.id);
    });
    body.appendChild(tr);
  });
}

function openDetail(id) {
  var found = null;
  for (var i = 0; i < apps.length; i++) {
    if (apps[i].id === id) found = apps[i];
  }
  if (!found) return;
  currentId = id;
  $("#detail-title").textContent = found.fullName + " — " + found.role;
  var rq = "";
  if (found.roleAnswers && typeof found.roleAnswers === "object") {
    rq = Object.keys(found.roleAnswers).map(function (k) {
      return "<dt>" + esc(prettyKey(k)) + "</dt><dd>" + esc(found.roleAnswers[k]) + "</dd>";
    }).join("");
  }
  $("#detail-body").innerHTML = "<dl>" +
    "<dt>Status</dt><dd><span class=\"status " + esc(found.status) + "\">" + esc(found.status) + "</span></dd>" +
    "<dt>Email</dt><dd>" + esc(found.email) + "</dd>" +
    "<dt>Discord</dt><dd>" + esc(found.discord) + "</dd>" +
    "<dt>Roblox</dt><dd>" + esc(found.robloxUsername) + " — " + esc(found.robloxLink) + "</dd>" +
    "<dt>Age</dt><dd>" + esc(found.age) + "</dd>" +
    "<dt>Country</dt><dd>" + esc(found.country) + "</dd>" +
    "<dt>Timezone</dt><dd>" + esc(found.timezone) + "</dd>" +
    "<dt>Hours/week</dt><dd>" + esc(found.hoursPerWeek) + "</dd>" +
    "<dt>Compensation</dt><dd>" + esc(found.compensation) + "</dd>" +
    "<dt>Portfolio</dt><dd>" + esc(found.portfolio) + "</dd>" +
    "<dt>Why join</dt><dd>" + esc(found.whyJoin) + "</dd>" +
    "<dt>Standout</dt><dd>" + esc(found.standout) + "</dd>" +
    "<dt>Submitted</dt><dd>" + esc(fmtDate(found.createdAt)) + " · IP " + esc(found.ip) + "</dd>" +
    rq + "</dl>";
  $("#detail-modal").hidden = false;
}

function closeDetail() {
  currentId = null;
  $("#detail-modal").hidden = true;
}

function exportCSV() {
  if (apps.length === 0) { toast("Nothing to export.", "error"); return; }
  var cols = ["id", "role", "status", "fullName", "email", "discord",
    "robloxUsername", "robloxLink", "age", "country", "timezone",
    "hoursPerWeek", "compensation", "portfolio", "whyJoin", "standout", "createdAt"];
  function q(v) { return '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"'; }
  var lines = [cols.join(",")];
  filteredApps().forEach(function (a) {
    lines.push(cols.map(function (c) { return q(a[c]); }).join(","));
  });
  var blob = new Blob([lines.join("\n")], { type: "text/csv" });
  var url = URL.createObjectURL(blob);
  var link = document.createElement("a");
  link.href = url;
  link.download = "sarthaks-studio-applications-" + new Date().toISOString().slice(0, 10) + ".csv";
  link.click();
  URL.revokeObjectURL(url);
  toast("Exported " + filteredApps().length + " rows ⬇", "ok");
}

function init() {
  if (getPw()) {
    showDashboard(true);
    loadApps().catch(function (e) { showDashboard(false); toast(e.message, "error"); });
  }

  function tryLogin() {
    var pw = $("#admin-pass").value;
    $("#login-err").textContent = "";
    $("#login-btn").disabled = true;
    login(pw).then(function () {
      try { sessionStorage.setItem(PW_KEY, pw); } catch (e) {}
      $("#admin-pass").value = "";
      showDashboard(true);
      return loadApps();
    }).then(function () {
      toast("Welcome back, Commander 👑", "ok");
    }).catch(function (e) {
      $("#login-err").textContent = e.message;
    }).then(function () {
      $("#login-btn").disabled = false;
    });
  }

  $("#login-btn").addEventListener("click", tryLogin);
  $("#admin-pass").addEventListener("keydown", function (e) { if (e.key === "Enter") tryLogin(); });

  ["filter-role", "filter-status"].forEach(function (id) {
    $("#" + id).addEventListener("change", renderTable);
  });
  $("#filter-search").addEventListener("input", renderTable);

  $("#refresh-btn").addEventListener("click", function () {
    loadApps().then(function () { toast("Refreshed ↻", "ok"); })
      .catch(function (e) { toast(e.message, "error"); });
  });
  $("#export-btn").addEventListener("click", exportCSV);
  $("#logout-btn").addEventListener("click", function () {
    try { sessionStorage.removeItem(PW_KEY); } catch (e) {}
    apps = [];
    showDashboard(false);
    toast("Logged out.");
  });

  $("#detail-close").addEventListener("click", closeDetail);
  $("#detail-modal").addEventListener("click", function (e) { if (e.target.id === "detail-modal") closeDetail(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeDetail(); });
  $("#detail-accept").addEventListener("click", function () { if (currentId) setStatus(currentId, "accepted"); });
  $("#detail-reject").addEventListener("click", function () { if (currentId) setStatus(currentId, "rejected"); });
  $("#detail-delete").addEventListener("click", function () {
    if (currentId && confirm("Permanently delete this application?")) deleteApp(currentId);
  });

  $("#admin-pass").focus();
}

document.addEventListener("DOMContentLoaded", init);
