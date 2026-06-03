import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db/client";
import { calendarEvent, projectMeta } from "@/db/schema";

// POST /api/projects/:id/billing
// Tělo: { nextInvoiceAt?: ISO, action?: "paid", projectName?: string }
//  - action "paid" → posune datum příští faktury o měsíc
//  - jinak nastaví/smaže datum dle nextInvoiceAt
// Synchronizuje připomínku v kalendáři (calendar_event navázaný na projekt).
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as {
    nextInvoiceAt?: string;
    action?: string;
    projectName?: string;
  } | null;

  // zjisti/zajisti project_meta řádek + jeho id a aktuální datum
  let metaId: string;
  let current: Date | null;
  if (id.startsWith("prj_")) {
    const [row] = await db
      .insert(projectMeta)
      .values({ vercelProjectId: id })
      .onConflictDoUpdate({
        target: projectMeta.vercelProjectId,
        set: { updatedAt: new Date() },
      })
      .returning({ id: projectMeta.id, nextInvoiceAt: projectMeta.nextInvoiceAt });
    metaId = row.id;
    current = row.nextInvoiceAt;
  } else {
    const row = await db.query.projectMeta.findFirst({ where: eq(projectMeta.id, id) });
    if (!row) return Response.json({ error: "Projekt nenalezen" }, { status: 404 });
    metaId = row.id;
    current = row.nextInvoiceAt;
  }

  let next: Date | null;
  if (body?.action === "paid") {
    const base = current ?? new Date();
    next = new Date(base);
    next.setMonth(next.getMonth() + 1);
  } else if (body?.nextInvoiceAt) {
    const d = new Date(body.nextInvoiceAt);
    next = Number.isNaN(d.getTime()) ? null : d;
  } else {
    next = null;
  }

  await db.update(projectMeta).set({ nextInvoiceAt: next }).where(eq(projectMeta.id, metaId));

  // synchronizace připomínky v kalendáři
  await db
    .delete(calendarEvent)
    .where(and(eq(calendarEvent.projectId, metaId), isNotNull(calendarEvent.projectId)));

  if (next) {
    const user = await db.query.appUser.findFirst();
    if (user) {
      await db.insert(calendarEvent).values({
        userId: user.id,
        projectId: metaId,
        kind: "followup",
        title: `Fakturovat — ${body?.projectName ?? "projekt"}`,
        startAt: next,
        allDay: true,
      });
    }
  }

  return Response.json({ ok: true, nextInvoiceAt: next?.toISOString() ?? null });
}
