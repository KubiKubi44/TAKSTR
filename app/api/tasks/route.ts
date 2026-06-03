import { db } from "@/db/client";
import { task } from "@/db/schema";

// POST /api/tasks — přidá úkol. Tělo: { title, dueAt?, note? }
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    title?: string;
    dueAt?: string;
    note?: string;
  } | null;
  if (!body?.title?.trim()) {
    return Response.json({ error: "Vyplň název úkolu." }, { status: 400 });
  }
  const due = body.dueAt ? new Date(body.dueAt) : null;
  const [row] = await db
    .insert(task)
    .values({
      title: body.title.trim(),
      dueAt: due && !Number.isNaN(due.getTime()) ? due : null,
      note: body.note?.trim() || null,
    })
    .returning({ id: task.id });
  return Response.json({ id: row.id });
}
