import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { suppression, type NewSuppression } from "@/db/schema";

// „Nikdy neoslovovat" seznam. Před každým odesláním se kontroluje;
// hard bounce / spam complaint / opt-out sem padá automaticky.

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function isSuppressed(email: string): Promise<boolean> {
  const row = await db.query.suppression.findFirst({
    where: eq(suppression.email, normalizeEmail(email)),
  });
  return !!row;
}

// Přidá e-mail na seznam (idempotentně). Vrací true, když byl nově přidán.
export async function addSuppression(input: {
  email: string;
  reason: NewSuppression["reason"];
  leadId?: string | null;
  note?: string | null;
}): Promise<boolean> {
  const email = normalizeEmail(input.email);
  if (!email) return false;
  const [row] = await db
    .insert(suppression)
    .values({
      email,
      reason: input.reason,
      leadId: input.leadId ?? null,
      note: input.note ?? null,
    })
    .onConflictDoNothing({ target: suppression.email })
    .returning({ id: suppression.id });
  return !!row;
}
