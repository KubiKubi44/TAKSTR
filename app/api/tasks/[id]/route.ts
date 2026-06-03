import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { task } from "@/db/schema";

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
