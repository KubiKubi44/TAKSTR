import Link from "next/link";
import { FollowupButton } from "@/components/followup-button";
import { PageContainer, PageHeader } from "@/components/page-shell";
import { OpportunityBadge } from "@/components/opportunity-badge";
import { StatusBadge } from "@/components/status-badge";
import { Card } from "@/components/ui/card";
import {
  getCampaignResponseRates,
  getDashboardMetrics,
  getDemandNewCount,
  listDemand,
  listLeads,
} from "@/db/queries";
import { LEAD_STATUS_LABEL, LEAD_STATUS_ORDER } from "@/lib/leadStatus";
import { computeOpportunity } from "@/lib/opportunity";

function Metric({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: string;
}) {
  return (
    <Card className="gap-1 p-5">
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`font-mono text-3xl tabular-nums ${tone ?? ""}`}>{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}

export const dynamic = "force-dynamic";

// Dashboard OBCHODU: poptávky, kampaně, leady (akvizice).
export default async function ObchodPage() {
  const m = await getDashboardMetrics();
  const leads = await listLeads();
  const campaignRates = await getCampaignResponseRates();
  const demandNew = await getDemandNewCount();
  const demand = await listDemand();
  const maxFunnel = Math.max(1, ...Object.values(m.statusCounts));

  // nejlepší leady podle PŘÍLEŽITOSTI (ne jen skóre webu)
  const topLeads = leads
    .map((l) => ({
      lead: l,
      opp: computeOpportunity({
        score: l.score,
        flags: l.flags,
        enrichment: l.enrichment as Record<string, unknown>,
        contactEmail: l.contactEmail,
        phone: l.phone,
      }),
    }))
    .filter((x) => x.lead.status !== "dead" && x.lead.status !== "won")
    .sort((a, b) => b.opp.score - a.opp.score)
    .slice(0, 8);

  return (
    <PageContainer>
      <PageHeader eyebrow="Akvizice" title="Obchod" actions={<FollowupButton />} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric
          label="Response rate"
          value={m.sent > 0 ? `${Math.round(m.responseRate * 100)} %` : "—"}
          hint={`${m.replies} odpovědí / ${m.sent} odesláno`}
          tone="text-info"
        />
        <Metric label="Odesláno" value={String(m.sent)} hint="celkem outbound" />
        <Metric label="Schůzky" value={String(m.meetings)} tone="text-info" />
        <Metric label="Zakázky" value={String(m.won)} tone="text-success" />
      </div>

      <Card className="mt-6 gap-3 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-sm font-semibold">
            Nové poptávky{demandNew > 0 ? ` (${demandNew})` : ""}
          </h2>
          <Link href="/poptavky" className="font-mono text-xs text-muted-foreground hover:text-primary">
            Poptávky →
          </Link>
        </div>
        {demand.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Zatím žádné poptávky. Na stránce Poptávky klikni „Obnovit teď“.
          </p>
        ) : (
          <ul className="divide-y divide-white/8">
            {demand.slice(0, 6).map((d) => (
              <li key={d.id} className="flex items-center gap-3 py-2 text-sm">
                {d.status === "new" && (
                  <span className="size-2 shrink-0 rounded-full bg-info" title="nová" />
                )}
                <a
                  href={d.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 truncate hover:text-primary"
                >
                  {d.title}
                </a>
                <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {d.source}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 font-heading text-sm font-semibold">Trychtýř — {m.totalLeads} leadů</h2>
          <div className="space-y-2">
            {LEAD_STATUS_ORDER.map((s) => {
              const c = m.statusCounts[s];
              return (
                <div key={s} className="flex items-center gap-3">
                  <span className="w-28 font-mono text-xs text-muted-foreground">
                    {LEAD_STATUS_LABEL[s]}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden bg-muted">
                    <div className="h-full bg-primary/70" style={{ width: `${(c / maxFunnel) * 100}%` }} />
                  </div>
                  <span className="w-8 text-right font-mono text-sm tabular-nums">{c}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 font-heading text-sm font-semibold">Nejlepší příležitosti</h2>
          {topLeads.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Zatím žádné leady. Založ kampaň a spusť Discover.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {topLeads.map(({ lead: l, opp }) => (
                <li key={l.id}>
                  <Link href={`/leady/${l.id}`} className="flex items-center gap-3 py-2 hover:text-primary">
                    <OpportunityBadge opp={opp} />
                    <span className="flex-1 truncate text-sm">{l.businessName}</span>
                    <StatusBadge status={l.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-6 p-5">
        <h2 className="mb-4 font-heading text-sm font-semibold">Response rate po kampaních</h2>
        {campaignRates.length === 0 ? (
          <p className="text-sm text-muted-foreground">Zatím žádné kampaně.</p>
        ) : (
          <div className="space-y-2">
            {campaignRates.map((c) => (
              <div key={c.campaignId} className="flex items-center gap-3 text-sm">
                <Link href={`/kampane/${c.campaignId}`} className="w-48 truncate hover:text-primary">
                  {c.name}
                </Link>
                <div className="h-2 flex-1 overflow-hidden bg-muted">
                  <div className="h-full bg-primary" style={{ width: `${Math.round(c.rate * 100)}%` }} />
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
