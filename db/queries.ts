import { eq } from "drizzle-orm";
import { db } from "./client";
import { lead } from "./schema";

// Načte lead i se všemi vazbami jedním dotazem:
// kampaň, analýzy, drafty, outreach (odeslání/odpovědi) a časová osa.
export async function getLeadWithRelations(id: string) {
  return db.query.lead.findFirst({
    where: eq(lead.id, id),
    with: {
      campaign: true,
      analyses: {
        orderBy: (a, { desc }) => desc(a.analyzedAt),
      },
      drafts: {
        orderBy: (d, { asc }) => asc(d.version),
      },
      outreach: {
        orderBy: (o, { desc }) => desc(o.createdAt),
      },
      activities: {
        orderBy: (a, { desc }) => desc(a.createdAt),
      },
    },
  });
}

export type LeadWithRelations = NonNullable<
  Awaited<ReturnType<typeof getLeadWithRelations>>
>;
