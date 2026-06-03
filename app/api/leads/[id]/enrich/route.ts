import { enrichLead, PipelineError } from "@/lib/pipeline";

// POST /api/leads/:id/enrich — obohatí lead z ARES + Google hodnocení.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const result = await enrichLead(id, "app");
    return Response.json({ leadId: id, ...result });
  } catch (err) {
    if (err instanceof PipelineError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
