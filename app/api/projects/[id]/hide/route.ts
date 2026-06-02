import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { projectMeta } from "@/db/schema";

// POST /api/projects/:id/hide — skryje/odkryje projekt. Tělo: { hidden: boolean }
// id = Vercel project id (prj_…) nebo uuid ručního projektu.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { hidden?: boolean } | null;
  const hidden = body?.hidden === true;

  if (id.startsWith("prj_")) {
    await db
      .insert(projectMeta)
      .values({ vercelProjectId: id, hidden })
      .onConflictDoUpdate({
        target: projectMeta.vercelProjectId,
        set: { hidden, updatedAt: new Date() },
      });
  } else {
    await db.update(projectMeta).set({ hidden }).where(eq(projectMeta.id, id));
  }

  return Response.json({ ok: true, hidden });
}
