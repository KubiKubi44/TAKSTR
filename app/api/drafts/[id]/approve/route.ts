import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { emailDraft } from "@/db/schema";
import { logActivity } from "@/lib/leads";

// POST /api/drafts/:id/approve — schválí draft (status approved).
// Samotné odeslání řeší Fáze 6 (Resend). Schválení je akt člověka ve smyčce.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const draft = await db.query.emailDraft.findFirst({
    where: eq(emailDraft.id, id),
  });
  if (!draft) return Response.json({ error: "Draft nenalezen" }, { status: 404 });

  await db
    .update(emailDraft)
    .set({ status: "approved" })
    .where(eq(emailDraft.id, id));

  await logActivity({
    leadId: draft.leadId,
    type: "note",
    actor: "app",
    payload: { event: "draft_approved", draftId: id, version: draft.version },
  });

  return Response.json({ ok: true });
}
