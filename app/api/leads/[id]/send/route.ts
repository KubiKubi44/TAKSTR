import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { emailDraft, lead, outreach } from "@/db/schema";
import { getLeadWithRelations } from "@/db/queries";
import { logActivity, updateLeadStatus } from "@/lib/leads";
import { sendEmail } from "@/lib/resend";

// POST /api/leads/:id/send — odešle poslední draft (approved/drafted) přes Resend.
// Založí outreach (outbound), draft → sent, lead → sent, activity.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const leadRow = await getLeadWithRelations(id);
  if (!leadRow) return Response.json({ error: "Lead nenalezen" }, { status: 404 });

  const draft = leadRow.drafts.at(-1);
  if (!draft) {
    return Response.json({ error: "Lead nemá žádný draft." }, { status: 400 });
  }
  if (draft.status !== "approved" && draft.status !== "draft") {
    return Response.json(
      { error: `Draft je ve stavu „${draft.status}" — odeslat lze jen schválený/rozpracovaný.` },
      { status: 400 },
    );
  }

  const recipient = draft.recipientEmail ?? leadRow.contactEmail;
  if (!recipient) {
    return Response.json(
      { error: "Chybí příjemce (recipient_email ani contact_email)." },
      { status: 400 },
    );
  }

  let providerId: string;
  try {
    const result = await sendEmail({
      to: recipient,
      subject: draft.subject,
      body: draft.body,
    });
    providerId = result.providerId;
  } catch (err) {
    const message = (err as Error).message;
    const status = message.includes("RESEND_API_KEY") || message.includes("MAIL_FROM") ? 503 : 502;
    return Response.json({ error: `Odeslání selhalo: ${message}` }, { status });
  }

  await db.insert(outreach).values({
    leadId: leadRow.id,
    draftId: draft.id,
    direction: "outbound",
    toAddr: recipient,
    providerId,
    status: "sent",
    sentAt: new Date(),
  });

  await db
    .update(emailDraft)
    .set({ status: "sent" })
    .where(eq(emailDraft.id, draft.id));

  await db
    .update(lead)
    .set({ contactEmail: leadRow.contactEmail ?? recipient })
    .where(eq(lead.id, leadRow.id));

  await logActivity({
    leadId: leadRow.id,
    type: "email_sent",
    actor: "app",
    payload: { draftId: draft.id, version: draft.version, to: recipient, providerId },
  });

  await updateLeadStatus({
    leadId: leadRow.id,
    status: "sent",
    from: leadRow.status,
    actor: "app",
  });

  return Response.json({
    ok: true,
    to: recipient,
    providerId,
    draftVersion: draft.version,
  });
}
