import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { lead } from "@/db/schema";
import { logActivity } from "@/lib/leads";

// POST /api/leads/:id/note — ruční poznámka do časové osy. Tělo: { text }
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { text?: string } | null;
  const text = body?.text?.trim();
  if (!text) {
    return Response.json({ error: "Prázdná poznámka" }, { status: 400 });
  }

  const row = await db.query.lead.findFirst({ where: eq(lead.id, id) });
  if (!row) return Response.json({ error: "Lead nenalezen" }, { status: 404 });

  await logActivity({ leadId: id, type: "note", actor: "app", payload: { text } });
  return Response.json({ ok: true });
}
