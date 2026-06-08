import Link from "next/link";
import { PageContainer, PageHeader } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import {
  getDueInvoices,
  getFinanceSummary,
  getTasksGrouped,
  getUpcomingEvents,
} from "@/db/queries";
import { ASSIGNEE_CHIP, ASSIGNEE_LABEL, PRIORITY_BAR } from "@/lib/taskMeta";
import { COLOR_TEXT, EVENT_KIND_LABEL, eventColorToken } from "@/lib/eventMeta";

const czk = (n: number) => `${n.toLocaleString("cs-CZ")} Kč`;

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

// Dashboard CHODU FIRMY: finance, fakturace, úkoly, kalendář.
export default async function ProvozPage() {
  // nezávislé dotazy paralelně (rychlejší než za sebou)
  const [fin, dueInvoices, tasks, upcoming] = await Promise.all([
    getFinanceSummary(),
    getDueInvoices(),
    getTasksGrouped(),
    getUpcomingEvents(6),
  ]);
  const todayTasks = [...tasks.overdue, ...tasks.today];
  const weekTasks = tasks.week;

  return (
    <PageContainer>
      <PageHeader eyebrow="Chod firmy" title="Provoz" />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label="MRR" value={czk(fin.mrr)} hint={`${fin.paying} projektů ve správě`} tone="text-success" />
        <Metric label="Náklady / měsíc" value={czk(fin.recurringCost)} hint="opakované výdaje" tone="text-destructive" />
        <Metric
          label="Čistý zisk / měsíc"
          value={czk(fin.monthlyProfit)}
          hint={`ročně ${czk(fin.annualProfit)}`}
          tone={fin.monthlyProfit >= 0 ? "text-success" : "text-destructive"}
        />
        <Metric label="Úkoly dnes" value={String(todayTasks.length)} hint="dnes & po termínu" />
      </div>

      <div className="mt-3 flex justify-end">
        <Link href="/finance" className="font-mono text-xs text-muted-foreground hover:text-primary">
          Finance →
        </Link>
      </div>

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

      {todayTasks.length > 0 && (
        <Card className="mt-6 gap-3 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-sm font-semibold">
              Úkoly — dnes &amp; po termínu ({todayTasks.length})
            </h2>
            <Link href="/ukoly" className="font-mono text-xs text-muted-foreground hover:text-primary">
              Úkoly →
            </Link>
          </div>
          <ul className="divide-y divide-white/8">
            {todayTasks.map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-2 text-sm">
                <span className={`size-2 shrink-0 rounded-full ${PRIORITY_BAR[t.priority]}`} />
                <span className="flex-1 truncate">{t.title}</span>
                {t.assignee && (
                  <span
                    className={`shrink-0 border px-1 py-0.5 font-mono text-[10px] uppercase tracking-wider ${ASSIGNEE_CHIP[t.assignee] ?? "border-border text-muted-foreground"}`}
                  >
                    {ASSIGNEE_LABEL[t.assignee] ?? t.assignee}
                  </span>
                )}
                {t.project && (
                  <Link
                    href={`/projekty/${t.project.vercelProjectId ?? t.project.id}`}
                    className="shrink-0 truncate text-xs text-muted-foreground hover:text-primary"
                  >
                    {t.project.name}
                  </Link>
                )}
                {t.dueAt && (
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">
                    {new Date(t.dueAt).toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" })}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {weekTasks.length > 0 && (
        <Card className="mt-6 gap-3 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-sm font-semibold">
              Úkoly — tento týden ({weekTasks.length})
            </h2>
            <Link href="/ukoly" className="font-mono text-xs text-muted-foreground hover:text-primary">
              Úkoly →
            </Link>
          </div>
          <ul className="divide-y divide-white/8">
            {weekTasks.map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-2 text-sm">
                <span className={`size-2 shrink-0 rounded-full ${PRIORITY_BAR[t.priority]}`} />
                <span className="flex-1 truncate">{t.title}</span>
                {t.assignee && (
                  <span
                    className={`shrink-0 border px-1 py-0.5 font-mono text-[10px] uppercase tracking-wider ${ASSIGNEE_CHIP[t.assignee] ?? "border-border text-muted-foreground"}`}
                  >
                    {ASSIGNEE_LABEL[t.assignee] ?? t.assignee}
                  </span>
                )}
                {t.project && (
                  <Link
                    href={`/projekty/${t.project.vercelProjectId ?? t.project.id}`}
                    className="shrink-0 truncate text-xs text-muted-foreground hover:text-primary"
                  >
                    {t.project.name}
                  </Link>
                )}
                {t.dueAt && (
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">
                    {new Date(t.dueAt).toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" })}
                  </span>
                )}
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
                  className={`font-mono text-[10px] uppercase tracking-wider ${COLOR_TEXT[eventColorToken(e)]}`}
                >
                  {EVENT_KIND_LABEL[e.kind] ?? e.kind}
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
    </PageContainer>
  );
}
