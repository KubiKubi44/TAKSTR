import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { lead, projectMeta } from "@/db/schema";
import { logActivity } from "@/lib/leads";

// POST /api/leads/:id/project — založí projekt z leadu (přenese firmu, web, kontakt).
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const row = await db.query.lead.findFirst({ where: eq(lead.id, id) });
  if (!row) return Response.json({ error: "Lead nenalezen" }, { status: 404 });

  // už existuje projekt z tohoto leadu? → vrať ho
  const existing = await db.query.projectMeta.findFirst({
    where: eq(projectMeta.leadId, id),
  });
  if (existing) {
    return Response.json({ id: existing.id, existed: true });
  }

  const [proj] = await db
    .insert(projectMeta)
    .values({
      name: row.businessName,
      url: row.websiteUrl,
      clientEmail: row.contactEmail,
      clientPhone: row.phone,
      leadId: row.id,
    })
    .returning({ id: projectMeta.id });

  await logActivity({
    leadId: row.id,
    type: "note",
    actor: "app",
    payload: { event: "project_created", projectId: proj.id },
  });

  return Response.json({ id: proj.id });
}
