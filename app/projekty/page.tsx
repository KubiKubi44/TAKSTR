import Link from "next/link";
import { PageContainer, PageHeader } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { listProjectMeta } from "@/db/queries";
import { listVercelProjects, type VercelProject } from "@/lib/vercel";

export const dynamic = "force-dynamic";

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
  return state ? map[state] ?? state.toLowerCase() : "—";
}

const czk = (n: number | null | undefined) =>
  n || n === 0 ? `${n.toLocaleString("cs-CZ")} Kč` : "—";

export default async function ProjectsPage() {
  let projects: VercelProject[] | null = null;
  let error: string | null = null;
  try {
    projects = await listVercelProjects();
  } catch (err) {
    error = (err as Error).message;
  }
  const meta = await listProjectMeta();
  const metaById = new Map(meta.map((m) => [m.vercelProjectId, m]));

  const monthlyTotal = meta.reduce((s, m) => s + (m.monthlyPrice ?? 0), 0);
  const buildTotal = meta.reduce((s, m) => s + (m.buildPrice ?? 0), 0);

  return (
    <PageContainer wide>
      <PageHeader
        eyebrow="Hosting"
        title="Projekty"
        subtitle="Přehled projektů na Vercelu — ceny, správa, stav deploye"
      />

      {error ? (
        <Card className="gap-2 p-6 text-sm">
          <p className="text-muted-foreground">Nepodařilo se načíst projekty:</p>
          <p className="font-mono text-xs text-destructive">{error}</p>
          <p className="mt-2 text-muted-foreground">
            Vytvoř token na{" "}
            <a href="https://vercel.com/account/tokens" target="_blank" rel="noreferrer" className="text-primary hover:underline">
              vercel.com/account/tokens
            </a>{" "}
            a vlož ho do <span className="font-mono">.env</span> jako{" "}
            <span className="font-mono">VERCEL_TOKEN</span>.
          </p>
        </Card>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Card className="gap-1 p-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Projektů
              </p>
              <p className="font-mono text-2xl tabular-nums">{projects?.length ?? 0}</p>
            </Card>
            <Card className="gap-1 p-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Měsíčně celkem
              </p>
              <p className="font-mono text-2xl tabular-nums text-primary">{czk(monthlyTotal)}</p>
            </Card>
            <Card className="gap-1 p-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Výroba celkem
              </p>
              <p className="font-mono text-2xl tabular-nums">{czk(buildTotal)}</p>
            </Card>
          </div>

          {projects && projects.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              Žádné projekty na účtu.
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {projects?.map((p) => {
                const m = metaById.get(p.id);
                return (
                  <Link key={p.id} href={`/projekty/${p.id}`}>
                    <Card className="gap-3 p-5 transition-colors hover:border-primary/50">
                      <div className="flex items-start justify-between gap-2">
                        <h2 className="font-heading text-base font-semibold tracking-tight">
                          {p.name}
                        </h2>
                        <span className={`shrink-0 border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${stateClass(p.state)}`}>
                          {stateLabel(p.state)}
                        </span>
                      </div>
                      <p className="font-mono text-xs text-muted-foreground">
                        {p.framework ?? "—"}
                        {p.repo ? ` · ${p.repo}` : ""}
                      </p>
                      <div className="flex items-end justify-between gap-2 border-t border-white/8 pt-3">
                        <div>
                          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                            Měsíční správa
                          </p>
                          <p className="font-mono text-lg tabular-nums text-primary">
                            {czk(m?.monthlyPrice)}
                          </p>
                        </div>
                        <p className="font-mono text-xs text-muted-foreground">
                          výroba {czk(m?.buildPrice)}
                        </p>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}
    </PageContainer>
  );
}
