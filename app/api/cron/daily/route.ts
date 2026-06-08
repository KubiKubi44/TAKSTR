import { db } from "@/db/client";
import { pollDemand } from "@/lib/demand";
import { composeDigest } from "@/lib/digest";
import { runFollowups } from "@/lib/pipeline";
import { sendMessage } from "@/lib/telegram";

// GET /api/cron/daily — jeden denní cron (Vercel Hobby umí 1× denně).
// Spustí: Telegram digest + monitor poptávek + auto-follow-upy.
// Chráněno CRON_SECRET (Vercel ho posílá v Authorization). Vyňato z auth.
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

  const out: Record<string, unknown> = {};

  // 1) denní digest do Telegramu
  try {
    const user = await db.query.appUser.findFirst();
    if (user?.telegramChatId && process.env.TELEGRAM_BOT_TOKEN) {
      await sendMessage(user.telegramChatId, await composeDigest());
      out.digest = "sent";
    } else {
      out.digest = "skipped";
    }
  } catch (e) {
    out.digest = `error: ${(e as Error).message}`;
  }

  // 2) monitor poptávek
  try {
    out.demand = await pollDemand();
  } catch (e) {
    out.demand = `error: ${(e as Error).message}`;
  }

  // 3) auto-follow-upy
  try {
    out.followups = await runFollowups();
  } catch (e) {
    out.followups = `error: ${(e as Error).message}`;
  }

  return Response.json(out);
}
