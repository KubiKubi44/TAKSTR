import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { projectMeta } from "@/db/schema";

// POST /api/projects/:id/rename — vlastní název (přezdívka) projektu.
// U Vercel projektu je to override (prázdné = zpět na původní Vercel název).
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { name?: string } | null;
  const raw = typeof body?.name === "string" ? body.name.trim() : "";

  if (id.startsWith("prj_")) {
    const name = raw === "" ? null : raw;
    await db
      .insert(projectMeta)
      .values({ vercelProjectId: id, name })
      .onConflictDoUpdate({
        target: projectMeta.vercelProjectId,
        set: { name, updatedAt: new Date() },
      });
  } else {
    if (raw === "") {
      return Response.json({ error: "Název nesmí být prázdný." }, { status: 400 });
    }
    await db.update(projectMeta).set({ name: raw }).where(eq(projectMeta.id, id));
  }

  return Response.json({ ok: true });
}
