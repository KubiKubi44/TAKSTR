import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { calendarEvent, type EventKind } from "@/db/schema";

// POST /api/calendar/:id — úprava události (jen poslaná pole).
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return Response.json({ error: "Neplatné tělo" }, { status: 400 });

  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof body.title === "string" && body.title.trim()) set.title = body.title.trim();
  if (body.kind === "meeting" || body.kind === "followup") set.kind = body.kind as EventKind;
  if ("startAt" in body && body.startAt) {
    const d = new Date(body.startAt as string);
    if (!Number.isNaN(d.getTime())) set.startAt = d;
  }
  if ("endAt" in body) {
    const v = body.endAt;
    const d = v ? new Date(v as string) : null;
    set.endAt = d && !Number.isNaN(d.getTime()) ? d : null;
  }
  if ("allDay" in body) set.allDay = body.allDay === true;
  if ("location" in body) set.location = typeof body.location === "string" ? body.location.trim() || null : null;
  if ("note" in body) set.note = typeof body.note === "string" ? body.note.trim() || null : null;
  if ("leadId" in body) set.leadId = (body.leadId as string) || null;

  await db.update(calendarEvent).set(set).where(eq(calendarEvent.id, id));
  return Response.json({ ok: true });
}

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
