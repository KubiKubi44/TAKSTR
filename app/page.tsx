import Link from "next/link";
import { PageContainer, PageHeader } from "@/components/page-shell";
import { ScoreBadge } from "@/components/score-badge";
import { StatusBadge } from "@/components/status-badge";
import { Card } from "@/components/ui/card";
import {
  getCampaignResponseRates,
  getDashboardMetrics,
  getDueInvoices,
  getProjectRevenue,
  getUpcomingEvents,
  listLeads,
} from "@/db/queries";

const czk = (n: number) => `${n.toLocaleString("cs-CZ")} Kč`;
import { LEAD_STATUS_LABEL, LEAD_STATUS_ORDER } from "@/lib/leadStatus";

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="gap-1 p-5">
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="font-mono text-3xl tabular-nums">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const m = await getDashboardMetrics();
  const leads = await listLeads();
  const campaignRates = await getCampaignResponseRates();
  const revenue = await getProjectRevenue();
  const dueInvoices = await getDueInvoices();
  const upcoming = await getUpcomingEvents(6);
  const topLeads = leads.filter((l) => l.score !== null).slice(0, 8);
  const maxFunnel = Math.max(1, ...Object.values(m.statusCounts));

  return (
    <PageContainer>
      <PageHeader eyebrow="Přehled" title="Dashboard" />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric
          label="Response rate"
          value={m.sent > 0 ? `${Math.round(m.responseRate * 100)} %` : "—"}
          hint={`${m.replies} odpovědí / ${m.sent} odesláno`}
        />
        <Metric label="Odesláno" value={String(m.sent)} hint="celkem outbound" />
        <Metric label="Schůzky" value={String(m.meetings)} />
        <Metric label="Zakázky" value={String(m.won)} />
      </div>

      <Card className="mt-8 flex flex-row flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Příjem ze správy webů
          </p>
          <div className="mt-2 flex items-end gap-8">
            <div>
              <p className="font-mono text-3xl tabular-nums text-primary">{czk(revenue.monthly)}</p>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                měsíčně · MRR
              </p>
            </div>
            <div>
              <p className="font-mono text-3xl tabular-nums">{czk(revenue.annual)}</p>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                ročně · ARR
              </p>
            </div>
          </div>
        </div>
        <Link href="/projekty" className="font-mono text-xs text-muted-foreground hover:text-primary">
          {revenue.paying} projektů ve správě →
        </Link>
      </Card>

      {dueInvoices.length > 0 && (
        <Card className="mt-6 gap-3 p-5">
          <h2 className="font-heading text-sm font-semibold text-destructive">
            K fakturaci ({dueInvoices.length})
          </h2>
          <ul className="divide-y divide-white/8">
            {dueInvoices.map((d) => (
              <li key={d.routeId} className="flex items-center gap-3 py-2 text-sm">
                <span className="w-28 shrink-0 font-mono text-xs text-destructive">
                  {new Date(d.date).toLocaleDateString("cs-CZ")}
                </span>
                <Link href={`/projekty/${d.routeId}`} className="flex-1 truncate hover:text-primary">
                  {d.name}
                </Link>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  {d.monthlyPrice ? czk(d.monthlyPrice) : ""}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="mt-6 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-sm font-semibold">Nadcházející</h2>
          <Link href="/kalendar" className="font-mono text-xs text-muted-foreground hover:text-primary">
            Kalendář →
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">Žádné naplánované schůzky ani follow-upy.</p>
        ) : (
          <ul className="divide-y divide-white/8">
            {upcoming.map((e) => (
              <li key={e.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="w-32 shrink-0 font-mono text-xs text-muted-foreground">
                  {new Date(e.startAt).toLocaleString("cs-CZ", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span
                  className={
                    e.kind === "meeting"
                      ? "font-mono text-[10px] uppercase tracking-wider text-primary"
                      : "font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
                  }
                >
                  {e.kind === "meeting" ? "schůzka" : "follow-up"}
                </span>
                <span className="flex-1 truncate">{e.title}</span>
                {e.lead && (
                  <Link
                    href={`/leady/${e.lead.id}`}
                    className="shrink-0 truncate text-xs text-muted-foreground hover:text-primary"
                  >
                    {e.lead.businessName}
                  </Link>
                )}
                {e.project && (
                  <Link
                    href={`/projekty/${e.project.vercelProjectId ?? e.project.id}`}
                    className="shrink-0 truncate text-xs text-muted-foreground hover:text-primary"
                  >
                    {e.project.name ?? "projekt"}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 font-heading text-sm font-semibold">
            Trychtýř — {m.totalLeads} leadů
          </h2>
          <div className="space-y-2">
            {LEAD_STATUS_ORDER.map((s) => {
              const c = m.statusCounts[s];
              return (
                <div key={s} className="flex items-center gap-3">
                  <span className="w-28 font-mono text-xs text-muted-foreground">
                    {LEAD_STATUS_LABEL[s]}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden bg-muted">
                    <div
                      className="h-full bg-primary/70"
                      style={{ width: `${(c / maxFunnel) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-right font-mono text-sm tabular-nums">
                    {c}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 font-heading text-sm font-semibold">
            Nejlepší leady podle skóre
          </h2>
          {topLeads.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Zatím žádné oskórované leady. Založ kampaň a spusť Discover.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {topLeads.map((l) => (
                <li key={l.id}>
                  <Link
                    href={`/leady/${l.id}`}
                    className="flex items-center gap-3 py-2 hover:text-primary"
                  >
                    <ScoreBadge score={l.score} />
                    <span className="flex-1 truncate text-sm">
                      {l.businessName}
                    </span>
                    <StatusBadge status={l.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-6 p-5">
        <h2 className="mb-4 font-heading text-sm font-semibold">
          Response rate po kampaních
        </h2>
        {campaignRates.length === 0 ? (
          <p className="text-sm text-muted-foreground">Zatím žádné kampaně.</p>
        ) : (
          <div className="space-y-2">
            {campaignRates.map((c) => (
              <div key={c.campaignId} className="flex items-center gap-3 text-sm">
                <Link
                  href={`/kampane/${c.campaignId}`}
                  className="w-48 truncate hover:text-primary"
                >
                  {c.name}
                </Link>
                <div className="h-2 flex-1 overflow-hidden bg-muted">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${Math.round(c.rate * 100)}%` }}
                  />
                </div>
                <span className="w-28 text-right font-mono text-xs tabular-nums text-muted-foreground">
                  {c.replies}/{c.sent}{" "}
                  <span className="text-foreground">
                    {c.sent > 0 ? `${Math.round(c.rate * 100)} %` : "—"}
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </PageContainer>
  );
}
