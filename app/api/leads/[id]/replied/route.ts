import { markReplied, PipelineError } from "@/lib/pipeline";

// POST /api/leads/:id/replied — ruční „označit odpovězeno" (viz pipeline).
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    await markReplied(id, "app");
    return Response.json({ ok: true });
  } catch (err) {
    if (err instanceof PipelineError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
