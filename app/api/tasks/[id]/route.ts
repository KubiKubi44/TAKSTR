import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { task } from "@/db/schema";

const PRIORITIES = ["low", "normal", "high"];

// POST /api/tasks/:id — úprava úkolu (jen poslaná pole).
// Tělo: { title?, dueAt?, priority?, projectId?, leadId?, note? }
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return Response.json({ error: "Neplatné tělo" }, { status: 400 });

  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof body.title === "string" && body.title.trim()) set.title = body.title.trim();
  if ("dueAt" in body) {
    const v = body.dueAt;
    const d = v ? new Date(v as string) : null;
    set.dueAt = d && !Number.isNaN(d.getTime()) ? d : null;
  }
  if (typeof body.priority === "string" && PRIORITIES.includes(body.priority)) {
    set.priority = body.priority;
  }
  if ("projectId" in body) set.projectId = (body.projectId as string) || null;
  if ("leadId" in body) set.leadId = (body.leadId as string) || null;
  if ("note" in body) set.note = typeof body.note === "string" ? body.note.trim() || null : null;

  await db.update(task).set(set).where(eq(task.id, id));
  return Response.json({ ok: true });
}

// DELETE /api/tasks/:id — smaže úkol.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const removed = await db
    .delete(task)
    .where(eq(task.id, id))
    .returning({ id: task.id });
  if (removed.length === 0) {
    return Response.json({ error: "Úkol nenalezen" }, { status: 404 });
  }
  return Response.json({ ok: true });
}
