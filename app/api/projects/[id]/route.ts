import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { projectMeta } from "@/db/schema";

// DELETE /api/projects/:id — smaže ručně přidaný projekt.
// Vercel projekty (prj_…) nelze smazat (jsou externí) — použij Skrýt.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (id.startsWith("prj_")) {
    return Response.json(
      { error: "Vercel projekt nelze smazat — použij Skrýt." },
      { status: 400 },
    );
  }
  const removed = await db
    .delete(projectMeta)
    .where(eq(projectMeta.id, id))
    .returning({ id: projectMeta.id });
  if (removed.length === 0) {
    return Response.json({ error: "Projekt nenalezen" }, { status: 404 });
  }
  return Response.json({ ok: true });
}
