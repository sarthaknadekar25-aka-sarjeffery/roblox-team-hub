import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";

let herald = null;
let guildId = "";

export function initHerald({ token, guildId: gid }) {
  guildId = gid || "";
  if (!token) {
    console.log("[info] DISCORD_BOT_TOKEN not set — verdict DMs off.");
    return null;
  }
  herald = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
  onReadyOnce(() => {
    console.log(`[discord] herald online as ${herald.user.tag}`);
  });
  herald.login(token).catch((err) => {
    console.warn("[warn] Discord login failed:", err.message);
    herald = null;
  });
  return herald;
}

function onReadyOnce(fn) {
  let done = false;
  const wrap = (...args) => { if (done) return; done = true; fn(...args); };
  herald.once("ready", wrap);
  herald.once("clientReady", wrap);
}

function waitForHerald(timeoutMs = 15000) {
  if (!herald) return Promise.resolve(false);
  if (typeof herald.isReady === "function" && herald.isReady()) return Promise.resolve(true);
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), timeoutMs);
    onReadyOnce(() => {
      clearTimeout(timer);
      resolve(true);
    });
  });
}

export async function findApplicantMember(discordTag) {
  if (!herald) return null;
  const clean = String(discordTag || "").replace(/^@/, "").trim().toLowerCase();
  if (!clean || !guildId) return null;
  try {
    const guild = await herald.guilds.fetch(guildId);
    let member = guild.members.cache.find((m) => (m.user.username || "").toLowerCase() === clean);
    if (!member) {
      const all = await guild.members.fetch();
      member = all.find((m) => (m.user.username || "").toLowerCase() === clean)
        || all.find((m) => (m.nickname || "").toLowerCase() === clean);
    }
    return member || null;
  } catch (err) {
    console.warn("[warn] member lookup failed:", err.message);
    return null;
  }
}

export async function sendVerdictDM(app, status) {
  const accepted = status === "accepted";
  if (!await waitForHerald(15000)) {
    console.warn("[warn] herald not ready in time — DM skipped");
    return false;
  }
  try {
    const member = await findApplicantMember(app.discord);
    if (!member) {
      console.log(`[discord] no server member matches "${app.discord}" — DM skipped`);
      return false;
    }
    const mention = `<@${member.id}>`;
    const embed = accepted
      ? new EmbedBuilder()
        .setColor(0xff6a2b)
        .setTitle(`⚔️ Application Accepted`)
        .setDescription(
          `Congratulations, ${mention}.\n\n` +
          `After reviewing your application, we would like to welcome you as our new **${app.role}** at **Sarthak's Studio**. We were impressed by your work and believe you will be a strong addition to the team.`
        )
        .addFields(
          { name: "🎯 Role", value: String(app.role), inline: true },
          { name: "⏰ First task", value: "Arrives within a few days 📝", inline: true },
          { name: "📌 Next steps", value: "1️⃣ Introduce yourself in the team channel 💬\n2️⃣ Share your timezone so we can plan around you 🌍\n3️⃣ Await your trial task and give it your best ⚔️" }
        )
        .setFooter({ text: `Sarthak's Studio • ${app.id}` })
        .setTimestamp()
      : new EmbedBuilder()
        .setColor(0xc9a24b)
        .setTitle(`Application Update`)
        .setDescription(
          `Hello ${mention},\n\n` +
          `Thank you for applying for the **${app.role}** position, and for the time and effort you put into your application.\n\n` +
          `After careful review, we have decided to move forward with other candidates at this time. This decision reflects our current team needs — not your abilities, which we genuinely respect.`
        )
        .addFields(
          { name: "🔄 Going forward", value: "You are welcome to reapply in the future. We encourage you to keep building and refining your craft. 💛" }
        )
        .setFooter({ text: `Sarthak's Studio • ${app.id}` })
        .setTimestamp();
    await member.send({ embeds: [embed] });
    console.log(`[discord] verdict DM sent to ${member.user.username}`);
    return true;
  } catch (err) {
    console.warn("[warn] verdict DM failed:", err.message);
    return false;
  }
}

export async function sendStatusDiscord(app, status, webhookUrl) {
  const url = webhookUrl || "";
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
