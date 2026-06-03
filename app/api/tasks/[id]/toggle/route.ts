import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { task } from "@/db/schema";

// POST /api/tasks/:id/toggle — přepne hotovo.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const t = await db.query.task.findFirst({ where: eq(task.id, id) });
  if (!t) return Response.json({ error: "Úkol nenalezen" }, { status: 404 });
  await db.update(task).set({ done: !t.done }).where(eq(task.id, id));
  return Response.json({ ok: true, done: !t.done });
}
