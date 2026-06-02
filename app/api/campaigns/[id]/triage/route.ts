import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { campaign, lead } from "@/db/schema";
import { scoreLead } from "@/lib/leads";

const CONCURRENCY = 5;

// POST /api/campaigns/:id/triage — dávková triáž všech leadů kampaně
// ve stavu `discovered`. Slušná souběžnost (5), ať nezahltíme cizí weby.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const camp = await db.query.campaign.findFirst({
    where: eq(campaign.id, id),
  });
  if (!camp) {
    return Response.json({ error: "Kampaň nenalezena" }, { status: 404 });
  }

  const leads = await db.query.lead.findMany({
    where: and(eq(lead.campaignId, id), eq(lead.status, "discovered")),
  });

  const scored: Array<{ leadId: string; businessName: string; score: number }> = [];
  const failed: Array<{ leadId: string; businessName: string; error: string }> = [];

  for (let i = 0; i < leads.length; i += CONCURRENCY) {
    const chunk = leads.slice(i, i + CONCURRENCY);
    await Promise.all(
      chunk.map(async (row) => {
        try {
          const result = await scoreLead({
            leadId: row.id,
            websiteUrl: row.websiteUrl,
            fromStatus: row.status,
            actor: "app",
          });
          scored.push({
            leadId: row.id,
            businessName: row.businessName,
            score: result.score,
          });
        } catch (err) {
          failed.push({
            leadId: row.id,
            businessName: row.businessName,
            error: (err as Error).message,
          });
        }
      }),
    );
  }

  scored.sort((a, b) => b.score - a.score);

  return Response.json({
    campaign: { id: camp.id, name: camp.name },
    candidates: leads.length,
    scored: scored.length,
    failed: failed.length,
    topByScore: scored.slice(0, 20),
    failures: failed,
  });
}
