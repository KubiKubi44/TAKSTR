import Link from "next/link";
import { DeleteExpenseButton } from "@/components/delete-expense-button";
import { NewExpenseDialog } from "@/components/new-expense-dialog";
import { PageContainer, PageHeader } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import {
  getDueInvoices,
  getExpenses,
  getFinanceSummary,
  getInvoiceSchedule,
  getProjectIncomeRows,
} from "@/db/queries";

export const dynamic = "force-dynamic";

const czk = (n: number) => `${n.toLocaleString("cs-CZ")} Kč`;
const date = (d: Date | string) =>
  new Date(d).toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric" });

function Stat({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: "primary" | "destructive";
}) {
  return (
    <Card className="gap-1 p-4">
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p
        className={`font-mono text-2xl tabular-nums ${accent === "primary" ? "text-primary" : accent === "destructive" ? "text-destructive" : ""}`}
      >
        {value}
      </p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}

export default async function FinancePage() {
  const [summary, income, schedule, due, expenses] = await Promise.all([
    getFinanceSummary(),
    getProjectIncomeRows(),
    getInvoiceSchedule(),
    getDueInvoices(),
    getExpenses(),
  ]);

  const recurring = expenses.filter((e) => e.recurring);
  const oneTime = expenses.filter((e) => !e.recurring);

  return (
    <PageContainer wide>
      <PageHeader
        eyebrow="Peníze"
        title="Finance"
        subtitle="Příjmy ze správy, cashflow a náklady"
        actions={<NewExpenseDialog />}
      />

      {/* souhrn */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="MRR · měsíčně" value={czk(summary.mrr)} accent="primary" />
        <Stat label="Náklady · měsíčně" value={czk(summary.recurringCost)} accent="destructive" />
        <Stat
          label="Čistý zisk · měsíčně"
          value={czk(summary.monthlyProfit)}
          accent={summary.monthlyProfit >= 0 ? "primary" : "destructive"}
        />
        <Stat label="Čistý zisk · ročně" value={czk(summary.annualProfit)} hint={`ARR ${czk(summary.arr)}`} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Výroba celkem" value={czk(summary.buildTotal)} hint="jednorázové příjmy" />
        <Stat label="Jednorázové náklady" value={czk(summary.oneTimeCost)} />
        <Stat label="Tento měsíc k fakturaci" value={czk(schedule.thisMonthSum)} />
        <Stat label="Po termínu" value={String(due.length)} accent={due.length ? "destructive" : undefined} hint="projektů k fakturaci" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* cashflow */}
        <div className="space-y-6">
          {due.length > 0 && (
            <Card className="gap-3 p-5">
              <h2 className="font-heading text-sm font-semibold text-destructive">K fakturaci ({due.length})</h2>
              <ul className="divide-y divide-white/8">
                {due.map((d) => (
                  <li key={d.routeId} className="flex items-center gap-3 py-2 text-sm">
                    <span className="w-24 shrink-0 font-mono text-xs text-destructive">{date(d.date)}</span>
                    <Link href={`/projekty/${d.routeId}`} className="flex-1 truncate hover:text-primary">{d.name}</Link>
                    <span className="font-mono text-xs tabular-nums">{d.monthlyPrice ? czk(d.monthlyPrice) : ""}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card className="gap-3 p-5">
            <h2 className="font-heading text-sm font-semibold">Nadcházející faktury</h2>
            {schedule.upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">Žádné naplánované faktury.</p>
            ) : (
              <ul className="divide-y divide-white/8">
                {schedule.upcoming.map((u) => (
                  <li key={u.routeId} className="flex items-center gap-3 py-2 text-sm">
                    <span className="w-24 shrink-0 font-mono text-xs text-muted-foreground">{date(u.date)}</span>
                    <Link href={`/projekty/${u.routeId}`} className="flex-1 truncate hover:text-primary">{u.name}</Link>
                    <span className="font-mono text-xs tabular-nums text-primary">{u.amount ? czk(u.amount) : ""}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* náklady */}
        <Card className="gap-3 p-5">
          <h2 className="font-heading text-sm font-semibold">Náklady</h2>
          {expenses.length === 0 ? (
            <p className="text-sm text-muted-foreground">Žádné výdaje. Přidej přes „+ Přidat výdaj“.</p>
          ) : (
            <div className="space-y-4">
              {recurring.length > 0 && (
                <div>
                  <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Měsíční · {czk(summary.recurringCost)}
                  </p>
                  <ExpenseRows rows={recurring} />
                </div>
              )}
              {oneTime.length > 0 && (
                <div>
                  <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Jednorázové · {czk(summary.oneTimeCost)}
                  </p>
                  <ExpenseRows rows={oneTime} />
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* příjem po projektech */}
      <Card className="mt-6 gap-3 p-5">
        <h2 className="font-heading text-sm font-semibold">Příjem po projektech</h2>
        {income.length === 0 ? (
          <p className="text-sm text-muted-foreground">Zatím žádné projekty s cenou.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-4 font-normal">Projekt</th>
                  <th className="py-2 pr-4 text-right font-normal">Výroba</th>
                  <th className="py-2 pr-4 text-right font-normal">Měsíčně</th>
                  <th className="py-2 pr-4 text-right font-normal">Ročně</th>
                  <th className="py-2 text-right font-normal">Podíl MRR</th>
                </tr>
              </thead>
              <tbody>
                {income.map((r) => (
                  <tr key={r.routeId} className="border-b border-white/5">
                    <td className="py-2 pr-4">
                      <Link href={`/projekty/${r.routeId}`} className="hover:text-primary">{r.name}</Link>
                    </td>
                    <td className="py-2 pr-4 text-right font-mono tabular-nums text-muted-foreground">{r.build ? czk(r.build) : "—"}</td>
                    <td className="py-2 pr-4 text-right font-mono tabular-nums text-primary">{r.monthly ? czk(r.monthly) : "—"}</td>
                    <td className="py-2 pr-4 text-right font-mono tabular-nums">{r.annual ? czk(r.annual) : "—"}</td>
                    <td className="py-2 text-right font-mono tabular-nums text-muted-foreground">{Math.round(r.share * 100)} %</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </PageContainer>
  );
}

function ExpenseRows({
  rows,
}: {
  rows: { id: string; name: string; category: string | null; amount: number; note: string | null }[];
}) {
  return (
    <ul className="divide-y divide-white/8">
      {rows.map((e) => (
        <li key={e.id} className="flex items-center gap-3 py-1.5 text-sm">
          <span className="flex-1 truncate">
            {e.name}
            {e.category && <span className="ml-2 font-mono text-xs text-muted-foreground">{e.category}</span>}
          </span>
          <span className="font-mono text-xs tabular-nums text-destructive">{e.amount.toLocaleString("cs-CZ")} Kč</span>
          <DeleteExpenseButton id={e.id} />
        </li>
      ))}
    </ul>
  );
}
