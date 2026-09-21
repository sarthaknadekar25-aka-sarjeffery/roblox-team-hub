import { Client, GatewayIntentBits } from "discord.js";

let herald = null;
let guildId = "";

export function initHerald({ token, guildId: gid }) {
  guildId = gid || "";
  if (!token) {
    console.log("[info] DISCORD_BOT_TOKEN not set — verdict DMs off.");
    return null;
  }
  herald = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
  herald.once("ready", () => {
    console.log(`[discord] herald online as ${herald.user.tag}`);
  });
  herald.login(token).catch((err) => {
    console.warn("[warn] Discord login failed:", err.message);
    herald = null;
  });
  return herald;
}

function firstName(text) {
  return String(text || "friend").split(" ")[0] || "friend";
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
  const name = firstName(app.fullName);
  try {
    const member = await findApplicantMember(app.discord);
    if (!member) {
      console.log(`[discord] no server member matches "${app.discord}" — DM skipped`);
      return false;
    }
    const msg = accepted
      ? `⚔️ **You're in, ${name}!**\n\nYou've been **ACCEPTED** as **${app.role}** at **Sarthak's Studio**!\n\nNext steps:\n1. Say hi in the team channel\n2. Watch for your first trial task within a couple of days\n\nWelcome to the team!`
      : `Hi ${name},\n\nThanks for applying as **${app.role}** at **Sarthak's Studio**. We've decided to go a different way this time — fit and timing, not talent.\n\nKeep building, and feel free to apply again later. ⚔️`;
    await member.send(msg);
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
