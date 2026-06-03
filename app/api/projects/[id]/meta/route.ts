import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { projectMeta } from "@/db/schema";

const toInt = (v: unknown): number | null => {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
};
const toText = (v: unknown): string | null =>
  typeof v === "string" ? v.trim() || null : null;

// POST /api/projects/:id/meta — uloží jen ta pole, která dorazí (ceny/poznámka,
// klient, url, název). Díky tomu se různé formuláře navzájem nepřepisují.
// :id = Vercel project id (prj_…) nebo uuid ručního projektu.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return Response.json({ error: "Neplatné tělo" }, { status: 400 });

  const set: Record<string, unknown> = { updatedAt: new Date() };
  if ("name" in body) set.name = typeof body.name === "string" ? body.name : null;
  if ("url" in body) set.url = toText(body.url);
  if ("buildPrice" in body) set.buildPrice = toInt(body.buildPrice);
  if ("monthlyPrice" in body) set.monthlyPrice = toInt(body.monthlyPrice);
  if ("note" in body) set.note = typeof body.note === "string" ? body.note : null;
  if ("clientName" in body) set.clientName = toText(body.clientName);
  if ("clientEmail" in body) set.clientEmail = toText(body.clientEmail);
  if ("clientPhone" in body) set.clientPhone = toText(body.clientPhone);

  if (id.startsWith("prj_")) {
    await db
      .insert(projectMeta)
      .values({ vercelProjectId: id, ...set })
      .onConflictDoUpdate({ target: projectMeta.vercelProjectId, set });
  } else {
    await db.update(projectMeta).set(set).where(eq(projectMeta.id, id));
  }

  return Response.json({ ok: true });
}
