import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { calendarEvent } from "@/db/schema";

// DELETE /api/calendar/:id — smaže událost.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const existing = await db.query.calendarEvent.findFirst({
    where: eq(calendarEvent.id, id),
  });
  if (!existing) {
    return Response.json({ error: "Událost nenalezena" }, { status: 404 });
  }
  await db.delete(calendarEvent).where(eq(calendarEvent.id, id));
  return Response.json({ ok: true });
}
