import { db } from "@/db/client";
import { emailDraft } from "@/db/schema";
import { getLeadWithRelations } from "@/db/queries";
import { CLAUDE_MODEL, generateDraft, parseSender } from "@/lib/claude";
import { updateLeadStatus } from "@/lib/leads";

// POST /api/leads/:id/draft
// Tělo: { editInstruction?: string }
//   - bez instrukce  → vygeneruje novou verzi (v1, příp. další)
//   - s instrukcí     → vezme poslední draft jako prior a vyrobí novou verzi
// status = drafted, activity. (Telegram notifikace přijde ve Fázi 7.)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let editInstruction: string | undefined;
  try {
    const body = (await req.json()) as { editInstruction?: unknown };
    if (typeof body?.editInstruction === "string" && body.editInstruction.trim()) {
      editInstruction = body.editInstruction.trim();
    }
  } catch {
    // prázdné/žádné tělo je v pořádku → v1
  }

  const lead = await getLeadWithRelations(id);
  if (!lead) {
    return Response.json({ error: "Lead nenalezen" }, { status: 404 });
  }

  const analysis = lead.analyses[0]; // nejnovější (řazeno desc)
  if (!analysis) {
    return Response.json(
      { error: "Lead nemá analýzu. Nejdřív spusť POST /api/leads/:id/analyze." },
      { status: 400 },
    );
  }

  const latest = lead.drafts.at(-1); // nejvyšší verze (řazeno asc)
  const version = (latest?.version ?? 0) + 1;
  const prior =
    editInstruction && latest
      ? { subject: latest.subject, body: latest.body, version: latest.version }
      : undefined;

  const langs = Array.isArray(analysis.signals.langs)
    ? (analysis.signals.langs as string[])
    : undefined;

  let output;
  try {
    output = await generateDraft({
      businessName: lead.businessName,
      websiteUrl: lead.websiteUrl,
      contactEmail: lead.contactEmail,
      analysis: {
        builder: analysis.builder,
        mobileOk: analysis.mobileOk,
        hasEn: analysis.hasEn,
        pagespeed: analysis.pagespeed,
        langs,
        signals: analysis.signals,
        textExcerpt: analysis.textExcerpt,
      },
      sender: parseSender(process.env.MAIL_FROM),
      editInstruction,
      prior,
    });
  } catch (err) {
    const message = (err as Error).message;
    const status = message.includes("ANTHROPIC_API_KEY") ? 503 : 502;
    return Response.json(
      { error: `Generování draftu selhalo: ${message}` },
      { status },
    );
  }

  const [draft] = await db
    .insert(emailDraft)
    .values({
      leadId: lead.id,
      version,
      subject: output.subject,
      body: output.body,
      recipientEmail: output.recipientEmail,
      model: CLAUDE_MODEL,
      editInstruction: editInstruction ?? null,
      status: "draft",
    })
    .returning();

  await updateLeadStatus({
    leadId: lead.id,
    status: "drafted",
    from: lead.status,
    actor: "app",
    extra: { draftId: draft.id, version, editInstruction: editInstruction ?? null },
  });

  // TODO (Fáze 7): poslat draft jako notifikaci do Telegramu s tlačítky ✅/✏️/❌

  return Response.json({
    leadId: lead.id,
    draftId: draft.id,
    version,
    subject: draft.subject,
    body: draft.body,
    recipientEmail: draft.recipientEmail,
    notes: output.notes,
    model: CLAUDE_MODEL,
  });
}
