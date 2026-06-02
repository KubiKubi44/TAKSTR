import { db } from "@/db/client";
import { projectMeta } from "@/db/schema";

const toInt = (v: unknown): number | null => {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
};

// POST /api/projects — ručně přidaný projekt (mimo Vercel).
// Tělo: { name, url?, buildPrice?, monthlyPrice?, note? }
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    name?: string;
    url?: string;
    buildPrice?: unknown;
    monthlyPrice?: unknown;
    note?: unknown;
  } | null;

  if (!body?.name?.trim()) {
    return Response.json({ error: "Vyplň název projektu." }, { status: 400 });
  }

  const [row] = await db
    .insert(projectMeta)
    .values({
      name: body.name.trim(),
      url: body.url?.trim() || null,
      buildPrice: toInt(body.buildPrice),
      monthlyPrice: toInt(body.monthlyPrice),
      note: typeof body.note === "string" ? body.note : null,
    })
    .returning({ id: projectMeta.id });

  return Response.json({ id: row.id });
}
