import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { lead, siteAnalysis } from "@/db/schema";
import { analyzeWebsite } from "@/lib/analyzer";
import { logActivity, updateLeadStatus } from "@/lib/leads";

// POST /api/leads/:id/analyze
// Hloubková analýza vybraného leadu → nový řádek site_analysis,
// status = analyzed, activity. Re-analýza = další řádek (ne přepis).
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const row = await db.query.lead.findFirst({ where: eq(lead.id, id) });
  if (!row) {
    return Response.json({ error: "Lead nenalezen" }, { status: 404 });
  }

  let result;
  try {
    result = await analyzeWebsite(row.websiteUrl);
  } catch (err) {
    const message = (err as Error).message;
    await db
      .update(lead)
      .set({
        flags: { ...row.flags, websiteUnreachable: true, unreachableError: message },
      })
      .where(eq(lead.id, row.id));
    await logActivity({
      leadId: row.id,
      type: "note",
      actor: "app",
      payload: { event: "analyze_failed", reason: "unreachable", error: message },
    });
    return Response.json(
      { error: `Analýza selhala (web nedostupný): ${message}` },
      { status: 502 },
    );
  }

  const [analysis] = await db
    .insert(siteAnalysis)
    .values({
      leadId: row.id,
      builder: result.builder,
      mobileOk: result.mobileOk,
      hasEn: result.hasEn,
      pagespeed: result.pagespeed,
      signals: result.signals as unknown as Record<string, unknown>,
      textExcerpt: result.textExcerpt,
    })
    .returning({ id: siteAnalysis.id, analyzedAt: siteAnalysis.analyzedAt });

  // doplň kontaktní e-mail na lead, když ho ještě nemá
  let contactEmailSet = false;
  if (result.contactEmail && !row.contactEmail) {
    await db
      .update(lead)
      .set({ contactEmail: result.contactEmail })
      .where(eq(lead.id, row.id));
    contactEmailSet = true;
  }

  await updateLeadStatus({
    leadId: row.id,
    status: "analyzed",
    from: row.status,
    actor: "app",
    extra: {
      analysisId: analysis.id,
      builder: result.builder,
      mobileOk: result.mobileOk,
      hasEn: result.hasEn,
      pagespeed: result.pagespeed,
      contactEmail: result.contactEmail,
    },
  });

  return Response.json({
    leadId: row.id,
    analysisId: analysis.id,
    analyzedAt: analysis.analyzedAt,
    builder: result.builder,
    mobileOk: result.mobileOk,
    hasEn: result.hasEn,
    pagespeed: result.pagespeed,
    contactEmail: result.contactEmail,
    contactEmailSavedToLead: contactEmailSet,
    textExcerptLength: result.textExcerpt.length,
  });
}
