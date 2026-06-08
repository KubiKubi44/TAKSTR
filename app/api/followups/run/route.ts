import { runFollowups } from "@/lib/pipeline";

// GET /api/followups/run — vygeneruje follow-up drafty pro zralé leady.
// Chráněno CRON_SECRET (Vercel Cron / ruční). Vyňato z auth.
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
  const days = Number(new URL(req.url).searchParams.get("days")) || 5;
  const result = await runFollowups(days);
  return Response.json(result);
}
