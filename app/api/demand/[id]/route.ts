import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { demandLead, type DemandStatus } from "@/db/schema";

const STATUSES = ["new", "seen", "contacted", "dismissed"];

// POST /api/demand/:id — změní stav poptávky. Tělo: { status }
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { status?: string } | null;
  if (!body?.status || !STATUSES.includes(body.status)) {
    return Response.json({ error: "Neplatný stav." }, { status: 400 });
  }
  await db
    .update(demandLead)
    .set({ status: body.status as DemandStatus })
    .where(eq(demandLead.id, id));
  return Response.json({ ok: true });
}
