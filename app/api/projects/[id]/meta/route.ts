import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { projectMeta } from "@/db/schema";

// POST /api/projects/:id/meta — uloží ceny a poznámku k Vercel projektu.
// :id = Vercel project id. Tělo: { buildPrice?, monthlyPrice?, note?, name? }
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as {
    buildPrice?: unknown;
    monthlyPrice?: unknown;
    note?: unknown;
    name?: unknown;
    url?: string;
  } | null;

  const toInt = (v: unknown): number | null => {
    if (v === "" || v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? Math.round(n) : null;
  };

  const fields = {
    name: typeof body?.name === "string" ? body.name : null,
    buildPrice: toInt(body?.buildPrice),
    monthlyPrice: toInt(body?.monthlyPrice),
    note: typeof body?.note === "string" ? body.note : null,
  };

  if (id.startsWith("prj_")) {
    // Vercel projekt → upsert podle vercel_project_id
    await db
      .insert(projectMeta)
      .values({ vercelProjectId: id, ...fields })
      .onConflictDoUpdate({
        target: projectMeta.vercelProjectId,
        set: { ...fields, updatedAt: new Date() },
      });
  } else {
    // ruční projekt → update podle uuid (případně i url)
    await db
      .update(projectMeta)
      .set({
        ...fields,
        url: typeof body?.url === "string" ? body.url.trim() || null : undefined,
        updatedAt: new Date(),
      })
      .where(eq(projectMeta.id, id));
  }

  return Response.json({ ok: true });
}
