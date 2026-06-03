import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { expense } from "@/db/schema";

// DELETE /api/expenses/:id — smaže výdaj.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const removed = await db
    .delete(expense)
    .where(eq(expense.id, id))
    .returning({ id: expense.id });
  if (removed.length === 0) {
    return Response.json({ error: "Výdaj nenalezen" }, { status: 404 });
  }
  return Response.json({ ok: true });
}
