import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { calendarEvent } from "@/db/schema";

// POST /api/calendar/:id/done — přepne příznak hotovo (pro follow-upy).
export async function POST(
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
  await db
    .update(calendarEvent)
    .set({ done: !existing.done })
    .where(eq(calendarEvent.id, id));
  return Response.json({ ok: true, done: !existing.done });
}
