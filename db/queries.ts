import { and, asc, count, desc, eq, gte, isNotNull, lt, sql } from "drizzle-orm";
import { db } from "./client";
import {
  calendarEvent,
  campaign,
  demandLead,
  expense,
  lead,
  outreach,
  projectMeta,
  task,
  type DemandStatus,
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
      events: {
        orderBy: (e, { asc }) => asc(e.startAt),
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

// Teplé poptávky z portálů. Default skryje vyřízené (dismissed).
export async function listDemand(opts: { status?: DemandStatus } = {}) {
  return db.query.demandLead.findMany({
    where: opts.status
      ? eq(demandLead.status, opts.status)
      : sql`${demandLead.status} <> 'dismissed'`,
    orderBy: [sql`${demandLead.postedAt} desc nulls last`, desc(demandLead.createdAt)],
    limit: 200,
  });
}

export async function getDemandNewCount(): Promise<number> {
  const [row] = await db
    .select({ c: count() })
    .from(demandLead)
    .where(eq(demandLead.status, "new"));
  return row?.c ?? 0;
}

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

// Response rate po kampaních (odesláno vs. odpovědi).
export async function getCampaignResponseRates() {
  const rows = await db
    .select({
      campaignId: campaign.id,
      name: campaign.name,
      sent: count(sql`case when ${outreach.direction} = 'outbound' then 1 end`),
      replies: count(sql`case when ${outreach.direction} = 'inbound' then 1 end`),
    })
    .from(campaign)
    .leftJoin(lead, eq(lead.campaignId, campaign.id))
    .leftJoin(outreach, eq(outreach.leadId, lead.id))
    .groupBy(campaign.id, campaign.name, campaign.createdAt)
    .orderBy(desc(campaign.createdAt));

  return rows.map((r) => {
    const sent = Number(r.sent);
    const replies = Number(r.replies);
    return {
      campaignId: r.campaignId,
      name: r.name,
      sent,
      replies,
      rate: sent > 0 ? replies / sent : 0,
    };
  });
}

export type CampaignResponseRate = Awaited<
  ReturnType<typeof getCampaignResponseRates>
>[number];

// Všechny události kalendáře (s názvem leadu), řazené dle začátku.
export async function listCalendarEvents() {
  return db.query.calendarEvent.findMany({
    with: {
      lead: { columns: { id: true, businessName: true } },
      project: { columns: { id: true, name: true, vercelProjectId: true } },
    },
    orderBy: [asc(calendarEvent.startAt)],
  });
}

export type CalendarEventItem = Awaited<
  ReturnType<typeof listCalendarEvents>
>[number];

// Lokální data k Vercel projektům (ceny, poznámky).
export async function listProjectMeta() {
  return db.query.projectMeta.findMany();
}

export async function getProjectMeta(vercelProjectId: string) {
  return db.query.projectMeta.findFirst({
    where: eq(projectMeta.vercelProjectId, vercelProjectId),
  });
}

export async function getProjectMetaById(id: string) {
  return db.query.projectMeta.findFirst({ where: eq(projectMeta.id, id) });
}

// Projekty k fakturaci (datum příští faktury už nastalo).
export async function getDueInvoices() {
  const rows = await db.query.projectMeta.findMany({
    where: and(isNotNull(projectMeta.nextInvoiceAt), eq(projectMeta.hidden, false)),
  });
  const now = Date.now();
  return rows
    .filter((r) => r.nextInvoiceAt && r.nextInvoiceAt.getTime() <= now)
    .map((r) => ({
      routeId: r.vercelProjectId ?? r.id,
      name: r.name ?? "(bez názvu)",
      date: r.nextInvoiceAt as Date,
      monthlyPrice: r.monthlyPrice,
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

const taskLinks = {
  lead: { columns: { id: true, businessName: true } },
  project: { columns: { id: true, name: true, vercelProjectId: true } },
} as const;

// Úkoly i s vazbami (lead/projekt). Nehotové první, dle termínu, pak nejnovější.
export async function getTasks() {
  return db.query.task.findMany({
    with: taskLinks,
    orderBy: [asc(task.done), sql`${task.dueAt} asc nulls last`, desc(task.createdAt)],
  });
}

export type TaskWithLinks = Awaited<ReturnType<typeof getTasks>>[number];

// Úkoly rozdělené do skupin dle termínu + seřazené dle priority.
export async function getTasksGrouped() {
  const tasks = await getTasks();
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endToday = new Date(startToday);
  endToday.setDate(endToday.getDate() + 1);
  const endWeek = new Date(startToday);
  endWeek.setDate(endWeek.getDate() + 7);

  const w = (p: string) => (p === "high" ? 0 : p === "normal" ? 1 : 2);
  const sortFn = (a: TaskWithLinks, b: TaskWithLinks) =>
    w(a.priority) - w(b.priority) ||
    (a.dueAt?.getTime() ?? Infinity) - (b.dueAt?.getTime() ?? Infinity);

  const overdue: TaskWithLinks[] = [];
  const today: TaskWithLinks[] = [];
  const week: TaskWithLinks[] = [];
  const later: TaskWithLinks[] = [];
  const none: TaskWithLinks[] = [];
  for (const t of tasks.filter((t) => !t.done)) {
    if (!t.dueAt) none.push(t);
    else if (t.dueAt < startToday) overdue.push(t);
    else if (t.dueAt < endToday) today.push(t);
    else if (t.dueAt < endWeek) week.push(t);
    else later.push(t);
  }
  [overdue, today, week, later, none].forEach((g) => g.sort(sortFn));
  const done = tasks.filter((t) => t.done);
  return { overdue, today, week, later, none, done };
}

// Nehotové úkoly s termínem do konce dneška (po termínu + dnes) — dashboard/digest.
export async function getTodayTasks() {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return db.query.task.findMany({
    where: and(eq(task.done, false), isNotNull(task.dueAt), lt(task.dueAt, end)),
    with: taskLinks,
    orderBy: [asc(task.dueAt)],
  });
}

// ── Finance ──────────────────────────────────────────────────
export async function getExpenses() {
  return db.query.expense.findMany({
    orderBy: [desc(expense.recurring), desc(expense.amount)],
  });
}

export async function getFinanceSummary() {
  const rev = await getProjectRevenue();
  const exp = await db.query.expense.findMany();
  const recurringCost = exp
    .filter((e) => e.recurring)
    .reduce((s, e) => s + e.amount, 0);
  const oneTimeCost = exp
    .filter((e) => !e.recurring)
    .reduce((s, e) => s + e.amount, 0);
  const monthlyProfit = rev.monthly - recurringCost;
  return {
    mrr: rev.monthly,
    arr: rev.annual,
    buildTotal: rev.buildTotal,
    recurringCost,
    oneTimeCost,
    monthlyProfit,
    annualProfit: monthlyProfit * 12,
  };
}

export async function getProjectIncomeRows() {
  const rows = await db.query.projectMeta.findMany({
    where: eq(projectMeta.hidden, false),
  });
  const totalMonthly = rows.reduce((s, r) => s + (r.monthlyPrice ?? 0), 0);
  return rows
    .filter((r) => (r.monthlyPrice ?? 0) > 0 || (r.buildPrice ?? 0) > 0)
    .map((r) => ({
      routeId: r.vercelProjectId ?? r.id,
      name: r.name ?? "(bez názvu)",
      build: r.buildPrice ?? 0,
      monthly: r.monthlyPrice ?? 0,
      annual: (r.monthlyPrice ?? 0) * 12,
      share: totalMonthly > 0 ? (r.monthlyPrice ?? 0) / totalMonthly : 0,
    }))
    .sort((a, b) => b.monthly - a.monthly);
}

export async function getInvoiceSchedule() {
  const rows = await db.query.projectMeta.findMany({
    where: and(isNotNull(projectMeta.nextInvoiceAt), eq(projectMeta.hidden, false)),
  });
  const now = new Date();
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const upcoming = rows
    .filter((r) => r.nextInvoiceAt && r.nextInvoiceAt.getTime() > now.getTime())
    .map((r) => ({
      routeId: r.vercelProjectId ?? r.id,
      name: r.name ?? "(bez názvu)",
      date: r.nextInvoiceAt as Date,
      amount: r.monthlyPrice ?? 0,
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  const thisMonthSum = rows
    .filter(
      (r) => r.nextInvoiceAt && r.nextInvoiceAt >= startMonth && r.nextInvoiceAt < endMonth,
    )
    .reduce((s, r) => s + (r.monthlyPrice ?? 0), 0);
  return { upcoming, thisMonthSum };
}

// Opakovaný příjem ze správy (z aktivních = neskrytých projektů).
export async function getProjectRevenue() {
  const rows = await db.query.projectMeta.findMany();
  const active = rows.filter((r) => !r.hidden);
  const monthly = active.reduce((s, r) => s + (r.monthlyPrice ?? 0), 0);
  const buildTotal = active.reduce((s, r) => s + (r.buildPrice ?? 0), 0);
  const paying = active.filter((r) => (r.monthlyPrice ?? 0) > 0).length;
  return { monthly, annual: monthly * 12, buildTotal, paying };
}

// Nadcházející události (od teď, nehotové) — pro dashboard.
export async function getUpcomingEvents(limit = 5) {
  return db.query.calendarEvent.findMany({
    where: and(
      gte(calendarEvent.startAt, new Date()),
      eq(calendarEvent.done, false),
    ),
    with: {
      lead: { columns: { id: true, businessName: true } },
      project: { columns: { id: true, name: true, vercelProjectId: true } },
    },
    orderBy: [asc(calendarEvent.startAt)],
    limit,
  });
}
