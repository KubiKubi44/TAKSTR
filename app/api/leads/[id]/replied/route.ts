import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { lead, outreach } from "@/db/schema";
import { parseSender } from "@/lib/claude";
import { logActivity, updateLeadStatus } from "@/lib/leads";

// POST /api/leads/:id/replied — ruční „označit odpovězeno".
// Založí outreach (inbound), propojí s posledním odesláním, lead → replied.
// (Automatické IMAP párování je mimo rozsah v1.)
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const row = await db.query.lead.findFirst({ where: eq(lead.id, id) });
  if (!row) return Response.json({ error: "Lead nenalezen" }, { status: 404 });

  const now = new Date();

  // poslední odeslání (kvůli provázání a draft_id)
  const lastOutbound = await db.query.outreach.findFirst({
    where: and(eq(outreach.leadId, id), eq(outreach.direction, "outbound")),
    orderBy: [desc(outreach.sentAt)],
  });

  await db.insert(outreach).values({
    leadId: id,
    draftId: lastOutbound?.draftId ?? null,
    direction: "inbound",
    toAddr: parseSender(process.env.MAIL_FROM).email || "—",
    status: "replied",
    repliedAt: now,
  });

  // doplň repliedAt na původní odeslání (pro per-send tracking)
  if (lastOutbound) {
    await db
      .update(outreach)
      .set({ repliedAt: now })
      .where(eq(outreach.id, lastOutbound.id));
  }

  await logActivity({ leadId: id, type: "reply", actor: "app", payload: {} });

  await updateLeadStatus({
    leadId: id,
    status: "replied",
    from: row.status,
    actor: "app",
  });

  return Response.json({ ok: true });
}
