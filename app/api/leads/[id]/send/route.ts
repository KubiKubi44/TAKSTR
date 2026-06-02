import { PipelineError, sendLeadDraft } from "@/lib/pipeline";

// POST /api/leads/:id/send — odešle poslední draft přes Resend (viz pipeline).
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const result = await sendLeadDraft(id, "app");
    return Response.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof PipelineError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
