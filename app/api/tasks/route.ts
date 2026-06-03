import { db } from "@/db/client";
import { task, type TaskPriority } from "@/db/schema";

const PRIORITIES = ["low", "normal", "high"];

// POST /api/tasks — přidá úkol.
// Tělo: { title, dueAt?, note?, priority?, projectId?, leadId? }
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    title?: string;
    dueAt?: string;
    note?: string;
    priority?: string;
    projectId?: string;
    leadId?: string;
  } | null;
  if (!body?.title?.trim()) {
    return Response.json({ error: "Vyplň název úkolu." }, { status: 400 });
  }
  const due = body.dueAt ? new Date(body.dueAt) : null;
  const priority: TaskPriority = PRIORITIES.includes(body.priority ?? "")
    ? (body.priority as TaskPriority)
    : "normal";

  const [row] = await db
    .insert(task)
    .values({
      title: body.title.trim(),
      dueAt: due && !Number.isNaN(due.getTime()) ? due : null,
      note: body.note?.trim() || null,
      priority,
      projectId: body.projectId || null,
      leadId: body.leadId || null,
    })
    .returning({ id: task.id });
  return Response.json({ id: row.id });
}
