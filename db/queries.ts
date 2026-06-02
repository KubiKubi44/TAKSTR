import { and, count, desc, eq, sql } from "drizzle-orm";
import { db } from "./client";
import {
  campaign,
  lead,
  outreach,
  type LeadStatus,
} from "./schema";

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

// Kampaně se počtem leadů (pro seznam kampaní).
export async function getCampaignsWithCounts() {
  return db
    .select({
      id: campaign.id,
      name: campaign.name,
      vertical: campaign.vertical,
      region: campaign.region,
      status: campaign.status,
      createdAt: campaign.createdAt,
      leadCount: count(lead.id),
    })
    .from(campaign)
    .leftJoin(lead, eq(lead.campaignId, campaign.id))
    .groupBy(campaign.id)
    .orderBy(desc(campaign.createdAt));
}

// Jedna kampaň + její leady (řazené dle skóre).
export async function getCampaignWithLeads(id: string) {
  return db.query.campaign.findFirst({
    where: eq(campaign.id, id),
    with: {
      leads: {
        orderBy: [sql`${lead.score} desc nulls last`, desc(lead.createdAt)],
      },
    },
  });
}

// Seznam leadů s názvem kampaně; filtr dle stavu/kampaně, řazení dle skóre.
export async function listLeads(opts: {
  status?: LeadStatus;
  campaignId?: string;
} = {}) {
  const conds = [
    opts.status ? eq(lead.status, opts.status) : undefined,
    opts.campaignId ? eq(lead.campaignId, opts.campaignId) : undefined,
  ].filter(Boolean);

  return db.query.lead.findMany({
    where: conds.length ? and(...conds) : undefined,
    with: { campaign: { columns: { name: true } } },
    orderBy: [sql`${lead.score} desc nulls last`, desc(lead.createdAt)],
  });
}

export type LeadListItem = Awaited<ReturnType<typeof listLeads>>[number];

// Počty leadů podle stavu (trychtýř).
export async function getStatusCounts(): Promise<Record<LeadStatus, number>> {
  const rows = await db
    .select({ status: lead.status, c: count() })
    .from(lead)
    .groupBy(lead.status);

  const base: Record<LeadStatus, number> = {
    discovered: 0,
    scored: 0,
    analyzed: 0,
    drafted: 0,
    sent: 0,
    replied: 0,
    meeting: 0,
    won: 0,
    dead: 0,
  };
  for (const r of rows) base[r.status] = Number(r.c);
  return base;
}

// Souhrnné metriky pro dashboard (response rate dopočítá Fáze 6 plně).
export async function getDashboardMetrics() {
  const statusCounts = await getStatusCounts();
  const totalLeads = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  const [out] = await db
    .select({
      sent: count(sql`case when ${outreach.direction} = 'outbound' then 1 end`),
      replies: count(sql`case when ${outreach.direction} = 'inbound' then 1 end`),
    })
    .from(outreach);

  const sent = Number(out?.sent ?? 0);
  const replies = Number(out?.replies ?? 0);

  return {
    statusCounts,
    totalLeads,
    sent,
    replies,
    responseRate: sent > 0 ? replies / sent : 0,
    meetings: statusCounts.meeting,
    won: statusCounts.won,
  };
}
