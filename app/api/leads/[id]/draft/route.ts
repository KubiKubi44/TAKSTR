import { generateDraftForLead, PipelineError } from "@/lib/pipeline";

// POST /api/leads/:id/draft — vygeneruje draft (v1 / s editInstruction novou verzi).
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
    // prázdné tělo = v1
  }

  try {
    const { draft, notes } = await generateDraftForLead(id, { editInstruction, actor: "app" });
    return Response.json({
      leadId: id,
      draftId: draft.id,
      version: draft.version,
      subject: draft.subject,
      body: draft.body,
      recipientEmail: draft.recipientEmail,
      model: draft.model,
      notes,
    });
  } catch (err) {
    if (err instanceof PipelineError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
