import Link from "next/link";
import { NewProjectDialog } from "@/components/new-project-dialog";
import { PageContainer, PageHeader } from "@/components/page-shell";
import { ProjectCardActions } from "@/components/project-card-actions";
import { Card } from "@/components/ui/card";
import { listProjectMeta } from "@/db/queries";
import { listVercelProjects } from "@/lib/vercel";

export const dynamic = "force-dynamic";

interface DisplayProject {
  key: string;
  name: string;
  framework: string | null;
  state: string | null;
  repo: string | null;
  isVercel: boolean;
  hidden: boolean;
  buildPrice: number | null;
  monthlyPrice: number | null;
}

function stateClass(state: string | null): string {
  if (state === "READY") return "border-primary/40 text-primary";
  if (state === "ERROR" || state === "CANCELED")
    return "border-destructive/50 text-destructive";
  if (state === "BUILDING" || state === "QUEUED")
    return "border-border text-muted-foreground animate-pulse";
  return "border-border text-muted-foreground";
}
function stateLabel(state: string | null): string {
  const map: Record<string, string> = {
    READY: "nasazeno",
    ERROR: "chyba",
    BUILDING: "buildí se",
    QUEUED: "ve frontě",
    CANCELED: "zrušeno",
  };
  return state ? map[state] ?? state.toLowerCase() : "ručně";
}
const czk = (n: number | null | undefined) =>
  n || n === 0 ? `${n.toLocaleString("cs-CZ")} Kč` : "—";

const SORTS: Record<string, string> = {
  monthly: "Měsíčně",
  build: "Výroba",
  name: "Název",
  state: "Stav",
};

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ hidden?: string; sort?: string }>;
}) {
  const sp = await searchParams;
  const showHidden = sp.hidden === "1";
  const sort = sp.sort && sp.sort in SORTS ? sp.sort : "monthly";

  let vercelError: string | null = null;
  let vercel: Awaited<ReturnType<typeof listVercelProjects>> = [];
  try {
    vercel = await listVercelProjects();
  } catch (err) {
    vercelError = (err as Error).message;
  }
  const meta = await listProjectMeta();
  const metaByVercelId = new Map(
    meta.filter((m) => m.vercelProjectId).map((m) => [m.vercelProjectId!, m]),
  );

  const display: DisplayProject[] = [
    ...vercel.map((p) => {
      const m = metaByVercelId.get(p.id);
      return {
        key: p.id,
        name: m?.name ?? p.name,
        framework: p.framework,
        state: p.state,
        repo: p.repo,
        isVercel: true,
        hidden: m?.hidden ?? false,
        buildPrice: m?.buildPrice ?? null,
        monthlyPrice: m?.monthlyPrice ?? null,
      };
    }),
    ...meta
      .filter((m) => !m.vercelProjectId)
      .map((m) => ({
        key: m.id,
        name: m.name ?? "—",
        framework: null,
        state: null,
        repo: null,
        isVercel: false,
        hidden: m.hidden,
        buildPrice: m.buildPrice,
        monthlyPrice: m.monthlyPrice,
      })),
  ];

  const active = display.filter((d) => !d.hidden);
  const hiddenCount = display.length - active.length;
  const shown = (showHidden ? display.filter((d) => d.hidden) : active).sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name, "cs");
    if (sort === "build") return (b.buildPrice ?? 0) - (a.buildPrice ?? 0);
    if (sort === "state") return (a.state ?? "zzz").localeCompare(b.state ?? "zzz");
    return (b.monthlyPrice ?? 0) - (a.monthlyPrice ?? 0);
  });

  const monthlyTotal = active.reduce((s, d) => s + (d.monthlyPrice ?? 0), 0);
  const buildTotal = active.reduce((s, d) => s + (d.buildPrice ?? 0), 0);

  return (
    <PageContainer wide>
      <PageHeader
        eyebrow="Hosting"
        title="Projekty"
        subtitle="Vercel + ruční projekty — ceny, správa, stav"
        actions={<NewProjectDialog />}
      />

      {vercelError && (
        <Card className="mb-4 gap-1 p-4 text-sm">
          <p className="text-muted-foreground">Vercel se nenačetl:</p>
          <p className="font-mono text-xs text-destructive">{vercelError}</p>
        </Card>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="gap-1 p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Projektů</p>
          <p className="font-mono text-2xl tabular-nums">{active.length}</p>
        </Card>
        <Card className="gap-1 p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Měsíčně · MRR</p>
          <p className="font-mono text-2xl tabular-nums text-primary">{czk(monthlyTotal)}</p>
        </Card>
        <Card className="gap-1 p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Ročně · ARR</p>
          <p className="font-mono text-2xl tabular-nums text-primary">{czk(monthlyTotal * 12)}</p>
        </Card>
        <Card className="gap-1 p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Výroba celkem</p>
          <p className="font-mono text-2xl tabular-nums">{czk(buildTotal)}</p>
        </Card>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-xs">
        <Link
          href={`/projekty?sort=${sort}`}
          className={showHidden ? "text-muted-foreground hover:text-primary" : "text-foreground"}
        >
          Aktivní ({active.length})
        </Link>
        <Link
          href={`/projekty?hidden=1&sort=${sort}`}
          className={showHidden ? "text-foreground" : "text-muted-foreground hover:text-primary"}
        >
          Skryté ({hiddenCount})
        </Link>
        <span className="ml-2 text-muted-foreground/60">řadit:</span>
        {Object.entries(SORTS).map(([key, label]) => (
          <Link
            key={key}
            href={`/projekty?sort=${key}${showHidden ? "&hidden=1" : ""}`}
            className={sort === key ? "text-primary" : "text-muted-foreground hover:text-foreground"}
          >
            {label}
          </Link>
        ))}
      </div>

      {shown.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          {showHidden ? "Žádné skryté projekty." : "Žádné projekty."}
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {shown.map((p) => (
            <Card key={p.key} className="relative gap-3 p-5 transition-colors hover:border-primary/50">
              <Link href={`/projekty/${p.key}`} className="absolute inset-0" aria-label={p.name} />
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-heading text-base font-semibold tracking-tight">{p.name}</h2>
                <div className="relative z-10 flex items-center gap-1.5">
                  <span className={`shrink-0 border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${stateClass(p.state)}`}>
                    {stateLabel(p.state)}
                  </span>
                  <ProjectCardActions id={p.key} isVercel={p.isVercel} hidden={p.hidden} currentName={p.name} />
                </div>
              </div>
              <p className="font-mono text-xs text-muted-foreground">
                {p.isVercel ? `${p.framework ?? "—"}${p.repo ? ` · ${p.repo}` : ""}` : "ruční projekt"}
              </p>
              <div className="flex items-end justify-between gap-2 border-t border-white/8 pt-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Měsíční správa</p>
                  <p className="font-mono text-lg tabular-nums text-primary">{czk(p.monthlyPrice)}</p>
                </div>
                <p className="font-mono text-xs text-muted-foreground">výroba {czk(p.buildPrice)}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
