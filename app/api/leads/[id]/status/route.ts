import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { lead, type LeadStatus } from "@/db/schema";
import { LEAD_STATUS_ORDER } from "@/lib/leadStatus";
import { updateLeadStatus } from "@/lib/leads";

// POST /api/leads/:id/status — ruční změna stavu (kanban drag / detail).
// Tělo: { status }
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { status?: string } | null;
  const status = body?.status as LeadStatus | undefined;

  if (!status || !LEAD_STATUS_ORDER.includes(status)) {
    return Response.json({ error: "Neplatný stav" }, { status: 400 });
  }

  const row = await db.query.lead.findFirst({ where: eq(lead.id, id) });
  if (!row) return Response.json({ error: "Lead nenalezen" }, { status: 404 });
  if (row.status === status) return Response.json({ ok: true, unchanged: true });

  await updateLeadStatus({
    leadId: id,
    status,
    from: row.status,
    actor: "app",
    extra: { manual: true },
  });

  return Response.json({ ok: true });
}
