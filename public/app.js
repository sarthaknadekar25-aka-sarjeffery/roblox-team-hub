const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1552904605829038110/ukF19O56ngyFIk5av7fCyHt4BAsWfUAycL4QukFwGOpCvyInHFn2vMFgIxfb101ZtnF1";

function isApplicationPage() {
  return window.location.pathname.includes("apply.html");
}

function getFormData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function escapeDiscordText(text) {
  return String(text || "")
    .replace(/[\\`*_{}[\]()#+\-.!|>]/g, "\\$&")
    .slice(0, 1800);
}

function buildDiscordEmbed(data) {
  const fields = [
    { name: "Full Name", value: data.fullName || "Not provided", inline: true },
    { name: "Discord", value: data.discord || "Not provided", inline: true },
    { name: "Email", value: data.email || "Not provided", inline: true },
    { name: "Role", value: data.role || "Not provided", inline: false },
    { name: "Experience", value: data.experienceLevel || "Not provided", inline: true },
    { name: "Location", value: data.location || "Not provided", inline: true },
    { name: "Skills", value: data.skills || "Not provided", inline: false },
    { name: "Timezone", value: data.timezone || "Not provided", inline: true },
    { name: "Availability", value: data.availabilityHours || "Not provided", inline: true },
    { name: "Age", value: data.age || "Not provided", inline: true },
    { name: "Past Teams", value: data.pastTeams || "Not provided", inline: false },
    { name: "Portfolio / Links", value: data.portfolioLinks || "Not provided", inline: false },
    { name: "Social Links", value: data.socialLinks || "Not provided", inline: true },
    { name: "Why Join?", value: data.motivation || "Not provided", inline: false },
    { name: "Heard From", value: data.hearAbout || "Not provided", inline: true }
  ];

  return {
    title: "New Team Application",
    color: 12493548,
    fields,
    footer: { text: "Submitted via Team Applications page" },
    timestamp: new Date().toISOString()
  };
}

function getRequiredFields(form) {
  return Array.from(form.elements).filter((element) => element.required && element.name);
}

function validateForm(form) {
  const fields = getRequiredFields(form);
  let isValid = true;

  fields.forEach((field) => {
    const value = field.value.trim();
    let fieldValid = value.length > 0;

    if (field.type === "email") {
      fieldValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }

    if (field.name === "motivation") {
      fieldValid = value.length >= 50;
    }

    field.setAttribute("aria-invalid", String(!fieldValid));
    if (!fieldValid) {
      isValid = false;
    }
  });

  return isValid;
}

function updateProgress(form) {
  const requiredFields = getRequiredFields(form);
  let filled = 0;

  requiredFields.forEach((field) => {
    const value = field.value.trim();
    let valid = value.length > 0;
    if (field.type === "email") {
      valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }
    if (field.name === "motivation") {
      valid = value.length >= 50;
    }
    if (valid) filled++;
  });

  const percent = Math.round((filled / requiredFields.length) * 100);
  const progressBar = document.getElementById("progressBar");
  if (progressBar) {
    progressBar.style.width = percent + "%";
    progressBar.parentElement.setAttribute("aria-valuenow", percent);
  }
}

function initProgress(form) {
  const fields = form.elements;
  Array.from(fields).forEach((field) => {
    field.addEventListener("input", () => updateProgress(form));
    field.addEventListener("change", () => updateProgress(form));
  });
  updateProgress(form);
}

function updateCharCounter(textarea) {
  const counter = document.getElementById("motivationCounter");
  if (!counter) return;
  const length = textarea.value.length;
  counter.textContent = length;
  counter.classList.toggle("valid", length >= 50);
  counter.classList.toggle("invalid", length < 50 && length > 0);
}

async function submitApplication(form) {
  const status = document.getElementById("formStatus");
  const submitBtn = document.getElementById("submitBtn");

  if (!DISCORD_WEBHOOK_URL || DISCORD_WEBHOOK_URL.includes("PASTE_")) {
    status.className = "form-status error";
    status.textContent = "Webhook URL is not configured. Add it in app.js.";
    return;
  }

  if (!validateForm(form)) {
    status.className = "form-status error";
    status.textContent = "Please fill in all required fields correctly. Motivation needs at least 50 characters.";
    return;
  }

  const data = getFormData(form);
  const embed = buildDiscordEmbed(data);

  submitBtn.disabled = true;
  status.className = "form-status";
  status.textContent = "Sending application...";

  try {
    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        content: "New team application submitted:",
        embeds: [embed]
      })
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    status.className = "form-status success";
    status.textContent = "Application sent successfully. We will contact you soon.";
    form.reset();
    updateProgress(form);
    const counter = document.getElementById("motivationCounter");
    if (counter) {
      counter.textContent = "0";
      counter.classList.remove("valid", "invalid");
    }
  } catch (error) {
    status.className = "form-status error";
    status.textContent = "Could not send application. Please check your connection and try again.";
    console.error(error);
  } finally {
    submitBtn.disabled = false;
  }
}

function initApplicationPage() {
  const form = document.getElementById("applicationForm");
  if (!form) return;

  initProgress(form);

  const motivationTextarea = form.elements.motivation;
  if (motivationTextarea) {
    motivationTextarea.addEventListener("input", () => updateCharCounter(motivationTextarea));
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    submitApplication(form);
  });
}

if (isApplicationPage()) {
  initApplicationPage();
}