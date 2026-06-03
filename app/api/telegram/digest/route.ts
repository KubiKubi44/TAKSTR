import { db } from "@/db/client";
import { composeDigest } from "@/lib/digest";
import { sendMessage } from "@/lib/telegram";

// GET /api/telegram/digest — pošle denní souhrn do Telegramu.
// Chráněno CRON_SECRET (Authorization: Bearer … nebo ?secret=…).
// Volá ho Vercel Cron (viz vercel.json) nebo ručně.
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  if (req.headers.get("authorization") === `Bearer ${secret}`) return true;
  return new URL(req.url).searchParams.get("secret") === secret;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await db.query.appUser.findFirst();
  const chatId = user?.telegramChatId;
  if (!chatId || !process.env.TELEGRAM_BOT_TOKEN) {
    return Response.json({ error: "Telegram není nastavený." }, { status: 400 });
  }
  const text = await composeDigest();
  await sendMessage(chatId, text);
  return Response.json({ ok: true });
}
