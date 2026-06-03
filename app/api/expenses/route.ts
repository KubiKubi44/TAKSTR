import { db } from "@/db/client";
import { expense } from "@/db/schema";

// POST /api/expenses — přidá výdaj.
// Tělo: { name, amount, recurring?, category?, note? }
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    name?: string;
    amount?: unknown;
    recurring?: boolean;
    category?: string;
    note?: string;
  } | null;

  if (!body?.name?.trim()) {
    return Response.json({ error: "Vyplň název výdaje." }, { status: 400 });
  }
  const amount = Math.round(Number(body.amount));
  if (!Number.isFinite(amount)) {
    return Response.json({ error: "Neplatná částka." }, { status: 400 });
  }

  const [row] = await db
    .insert(expense)
    .values({
      name: body.name.trim(),
      category: body.category?.trim() || null,
      amount,
      recurring: body.recurring === true,
      note: body.note?.trim() || null,
    })
    .returning({ id: expense.id });

  return Response.json({ id: row.id });
}
