import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { outreach } from "@/db/schema";
import { logActivity } from "@/lib/leads";
import { addSuppression } from "@/lib/suppression";

// Webhook od Resendu — doručitelnostní události (RFC: Svix podpis).
// Aktualizuje stav v `outreach` (delivered/opened/clicked/bounced/complained)
// a hard bounce / spam complaint automaticky přidá na suppression list.
// Endpoint je v middleware vyňatý z auth (ověřuje se Svix podpisem).

// Pořadí stavů — status posouváme jen dopředu, nikdy zpět
// (po „opened" nechceme přepsat na „delivered", když dorazí pozdě).
const RANK: Record<string, number> = {
  sent: 1,
  delayed: 2,
  delivered: 3,
  opened: 4,
  clicked: 5,
  bounced: 6,
  complained: 7,
};

interface ResendEvent {
  type: string;
  created_at?: string;
  data?: { email_id?: string; to?: string[]; subject?: string };
}

// Ověření Svix podpisu (id.timestamp.body, HMAC-SHA256, base64).
function verifySvix(secret: string, headers: Headers, body: string): boolean {
  const id = headers.get("svix-id");
  const ts = headers.get("svix-timestamp");
  const sigHeader = headers.get("svix-signature");
  if (!id || !ts || !sigHeader) return false;

  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${ts}.${body}`).digest("base64");
  const expBuf = Buffer.from(expected);

  // header je mezerami oddělený seznam „v1,<sig>"
  return sigHeader.split(" ").some((part) => {
    const sig = part.includes(",") ? part.split(",")[1] : part;
    const sigBuf = Buffer.from(sig);
    return sigBuf.length === expBuf.length && timingSafeEqual(sigBuf, expBuf);
  });
}

export async function POST(req: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    return Response.json({ error: "Webhook secret není nastavený." }, { status: 503 });
  }

  const body = await req.text();
  if (!verifySvix(secret, req.headers, body)) {
    return Response.json({ error: "Neplatný podpis." }, { status: 401 });
  }

  let event: ResendEvent;
  try {
    event = JSON.parse(body) as ResendEvent;
  } catch {
    return Response.json({ ok: true });
  }

  const emailId = event.data?.email_id;
  const kind = event.type?.replace(/^email\./, ""); // "delivered", "bounced", …
  if (!emailId || !kind) return Response.json({ ok: true });

  try {
    const row = await db.query.outreach.findFirst({
      where: eq(outreach.providerId, emailId),
    });
    if (!row) return Response.json({ ok: true }); // neznámý e-mail — ignoruj

    const now = new Date();
    const patch: Record<string, unknown> = {};

    if (kind === "delivered") patch.deliveredAt = now;
    else if (kind === "opened") patch.openedAt = now;
    else if (kind === "clicked") patch.clickedAt = now;
    else if (kind === "bounced") patch.bouncedAt = now;
    else if (kind === "complained") patch.complainedAt = now;

    // status posuň jen dopředu
    const statusName = kind === "delivery_delayed" ? "delayed" : kind;
    if (RANK[statusName] && RANK[statusName] >= (RANK[row.status ?? "sent"] ?? 0)) {
      patch.status = statusName;
    }

    if (Object.keys(patch).length > 0) {
      await db.update(outreach).set(patch).where(eq(outreach.id, row.id));
    }

    // hard bounce / spam → suppression + zápis do časové osy leadu
    if (kind === "bounced" || kind === "complained") {
      const reason = kind === "bounced" ? "bounce" : "complaint";
      const added = await addSuppression({
        email: row.toAddr,
        reason,
        leadId: row.leadId,
      });
      await logActivity({
        leadId: row.leadId,
        type: "note",
        actor: "system",
        payload: { event: `email_${kind}`, to: row.toAddr, suppressed: added },
      });
    }
  } catch (err) {
    // nikdy nevracíme ne-200, ať Resend neretryuje donekonečna
    console.error("Resend webhook error:", err);
  }

  return Response.json({ ok: true });
}
