// Registrace Telegram webhooku.
// Použití: node scripts/set-telegram-webhook.mjs https://<verejny-tunel>
//   (URL je veřejná HTTPS adresa appky, např. z ngrok/cloudflared)
import "dotenv/config";

const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
const base = process.argv[2];

if (!token || !secret) {
  console.error("✗ Chybí TELEGRAM_BOT_TOKEN nebo TELEGRAM_WEBHOOK_SECRET v .env");
  process.exit(1);
}
if (!base) {
  console.error("✗ Použití: node scripts/set-telegram-webhook.mjs https://<tunel>");
  process.exit(1);
}

const url = `${base.replace(/\/$/, "")}/api/telegram/webhook`;

const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    url,
    secret_token: secret,
    allowed_updates: ["message", "callback_query"],
  }),
});

const data = await res.json();
if (data.ok) {
  console.log(`✓ Webhook nastaven na ${url}`);
} else {
  console.error("✗ Telegram:", JSON.stringify(data));
  process.exit(1);
}
