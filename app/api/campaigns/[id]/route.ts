import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { campaign } from "@/db/schema";

// DELETE /api/campaigns/:id — smaže kampaň. Leady a jejich analýzy/drafty/
// outreach/activity zmizí kaskádou (ON DELETE cascade).
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const existing = await db.query.campaign.findFirst({
    where: eq(campaign.id, id),
  });
  if (!existing) {
    return Response.json({ error: "Kampaň nenalezena" }, { status: 404 });
  }
  await db.delete(campaign).where(eq(campaign.id, id));
  return Response.json({ ok: true });
}
