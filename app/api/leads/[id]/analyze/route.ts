import { analyzeLead, PipelineError } from "@/lib/pipeline";

// POST /api/leads/:id/analyze — hloubková analýza (viz lib/pipeline.ts).
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const result = await analyzeLead(id, "app");
    return Response.json({ leadId: id, ...result });
  } catch (err) {
    if (err instanceof PipelineError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
