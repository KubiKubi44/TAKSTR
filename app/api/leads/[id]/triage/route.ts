import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { lead } from "@/db/schema";
import { scoreLead } from "@/lib/leads";

// POST /api/leads/:id/triage — levné oskórování jednoho leadu.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const row = await db.query.lead.findFirst({ where: eq(lead.id, id) });
  if (!row) {
    return Response.json({ error: "Lead nenalezen" }, { status: 404 });
  }

  try {
    const result = await scoreLead({
      leadId: row.id,
      websiteUrl: row.websiteUrl,
      fromStatus: row.status,
      actor: "app",
    });
    return Response.json({
      leadId: row.id,
      score: result.score,
      breakdown: result.breakdown,
      signals: result.signals,
    });
  } catch (err) {
    return Response.json(
      { error: `Triáž selhala: ${(err as Error).message}` },
      { status: 502 },
    );
  }
}
