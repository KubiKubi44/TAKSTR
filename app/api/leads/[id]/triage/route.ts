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

  const outcome = await scoreLead({
    leadId: row.id,
    websiteUrl: row.websiteUrl,
    fromStatus: row.status,
    actor: "app",
    flags: row.flags,
  });

  if (outcome.kind === "scored") {
    return Response.json({
      leadId: row.id,
      outcome: "scored",
      score: outcome.result.score,
      breakdown: outcome.result.breakdown,
      signals: outcome.result.signals,
    });
  }
  if (outcome.kind === "social") {
    return Response.json({
      leadId: row.id,
      outcome: "social",
      note: "Lead bez vlastního webu (jen sociální síť) — označeno, neskórováno.",
    });
  }
  return Response.json({
    leadId: row.id,
    outcome: "unreachable",
    note: "Web nedostupný — označeno příznakem, neskórováno.",
    error: outcome.error,
  });
}
