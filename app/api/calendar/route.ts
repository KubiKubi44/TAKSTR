import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { calendarEvent, lead, type EventKind } from "@/db/schema";
import { updateLeadStatus } from "@/lib/leads";

// POST /api/calendar — založí událost (schůzku / follow-up).
// Tělo: { title, kind, startAt, endAt?, allDay?, location?, note?, leadId? }
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    title?: string;
    kind?: EventKind;
    color?: string;
    startAt?: string;
    endAt?: string;
    allDay?: boolean;
    location?: string;
    note?: string;
    leadId?: string;
  } | null;

  if (!body?.title?.trim() || !body.kind || !body.startAt) {
    return Response.json(
      { error: "Vyplň název, typ a začátek." },
      { status: 400 },
    );
  }
  const start = new Date(body.startAt);
  if (Number.isNaN(start.getTime())) {
    return Response.json({ error: "Neplatné datum/čas." }, { status: 400 });
  }
  const end = body.endAt ? new Date(body.endAt) : null;

  const user = await db.query.appUser.findFirst();
  if (!user) {
    return Response.json({ error: "Žádný app_user." }, { status: 400 });
  }

  if (body.leadId) {
    const exists = await db.query.lead.findFirst({ where: eq(lead.id, body.leadId) });
    if (!exists) {
      return Response.json({ error: "Lead neexistuje." }, { status: 400 });
    }
  }

  const [event] = await db
    .insert(calendarEvent)
    .values({
      userId: user.id,
      leadId: body.leadId ?? null,
      kind: body.kind,
      color: body.color || null,
      title: body.title.trim(),
      startAt: start,
      endAt: end && !Number.isNaN(end.getTime()) ? end : null,
      allDay: body.allDay ?? false,
      location: body.location?.trim() || null,
      note: body.note?.trim() || null,
    })
    .returning({ id: calendarEvent.id });

  // schůzka navázaná na lead → posuň lead do stavu „meeting"
  if (body.kind === "meeting" && body.leadId) {
    const leadRow = await db.query.lead.findFirst({
      where: eq(lead.id, body.leadId),
    });
    if (leadRow && leadRow.status !== "meeting" && leadRow.status !== "won") {
      await updateLeadStatus({
        leadId: leadRow.id,
        status: "meeting",
        from: leadRow.status,
        actor: "app",
        extra: { eventId: event.id, scheduledAt: start.toISOString() },
      });
    }
  }

  return Response.json({ id: event.id });
}
