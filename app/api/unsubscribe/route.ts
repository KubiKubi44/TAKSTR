import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { outreach } from "@/db/schema";
import { logActivity } from "@/lib/leads";
import { addSuppression, normalizeEmail } from "@/lib/suppression";
import { verifyUnsubToken } from "@/lib/unsubscribe";

// Veřejný odhlašovací endpoint (vyňatý z auth).
// GET  = klik z patičky e-mailu → potvrzovací stránka
// POST = RFC 8058 One-Click (poštovní klient/provider odešle automaticky)

async function suppress(email: string): Promise<boolean> {
  const last = await db.query.outreach.findFirst({
    where: eq(outreach.toAddr, normalizeEmail(email)),
    orderBy: [desc(outreach.createdAt)],
  });
  const added = await addSuppression({
    email,
    reason: "unsubscribe",
    leadId: last?.leadId ?? null,
  });
  if (added && last?.leadId) {
    await logActivity({
      leadId: last.leadId,
      type: "note",
      actor: "system",
      payload: { event: "unsubscribed", to: normalizeEmail(email) },
    });
  }
  return added;
}

function page(title: string, message: string, ok: boolean): Response {
  const html = `<!doctype html>
<html lang="cs"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
  body{font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;background:#0b0b0c;color:#e7e7ea;
       display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;padding:24px}
  .card{max-width:440px;text-align:center;border:1px solid #26262b;border-radius:16px;padding:40px 32px;
        background:rgba(255,255,255,.03)}
  h1{font-size:18px;margin:0 0 12px}
  p{font-size:14px;line-height:1.6;color:#a1a1aa;margin:0}
  .icon{font-size:40px;margin-bottom:8px}
</style></head>
<body><div class="card"><div class="icon">${ok ? "✓" : "⚠️"}</div>
<h1>${title}</h1><p>${message}</p></div></body></html>`;
  return new Response(html, {
    status: ok ? 200 : 400,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = url.searchParams.get("e") ?? "";
  const token = url.searchParams.get("t") ?? "";

  if (!email || !verifyUnsubToken(email, token)) {
    return page("Neplatný odkaz", "Odhlašovací odkaz je neplatný nebo poškozený.", false);
  }
  await suppress(email);
  return page(
    "Odhlášeno",
    `Adresa ${normalizeEmail(email)} byla odhlášena. Už vám nenapíšeme.`,
    true,
  );
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const email = url.searchParams.get("e") ?? "";
  const token = url.searchParams.get("t") ?? "";
  if (!email || !verifyUnsubToken(email, token)) {
    return Response.json({ error: "Neplatný odkaz." }, { status: 400 });
  }
  await suppress(email);
  return Response.json({ ok: true });
}
