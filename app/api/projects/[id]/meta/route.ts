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
  } | null;

  const toInt = (v: unknown): number | null => {
    if (v === "" || v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? Math.round(n) : null;
  };

  const values = {
    vercelProjectId: id,
    name: typeof body?.name === "string" ? body.name : null,
    buildPrice: toInt(body?.buildPrice),
    monthlyPrice: toInt(body?.monthlyPrice),
    note: typeof body?.note === "string" ? body.note : null,
  };

  await db
    .insert(projectMeta)
    .values(values)
    .onConflictDoUpdate({
      target: projectMeta.vercelProjectId,
      set: {
        name: values.name,
        buildPrice: values.buildPrice,
        monthlyPrice: values.monthlyPrice,
        note: values.note,
        updatedAt: new Date(),
      },
    });

  return Response.json({ ok: true });
}
