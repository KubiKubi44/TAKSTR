import { pollDemand } from "@/lib/demand";

// GET /api/demand/poll — stáhne nové poptávky z portálů a pošle do Telegramu.
// Chráněno CRON_SECRET (Vercel Cron nebo ruční spuštění). Vyňato z auth.
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
  const result = await pollDemand();
  return Response.json(result);
}
