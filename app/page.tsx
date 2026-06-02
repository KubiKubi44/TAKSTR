import Link from "next/link";
import { PageContainer, PageHeader } from "@/components/page-shell";
import { ScoreBadge } from "@/components/score-badge";
import { StatusBadge } from "@/components/status-badge";
import { Card } from "@/components/ui/card";
import { getDashboardMetrics, listLeads } from "@/db/queries";
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
    </PageContainer>
  );
}
