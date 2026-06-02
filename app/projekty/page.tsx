import { PageContainer, PageHeader } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
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

function ago(ms: number | null): string {
  if (!ms) return "";
  const diff = Date.now() - ms;
  const min = Math.round(diff / 60000);
  if (min < 60) return `před ${min} min`;
  const h = Math.round(min / 60);
  if (h < 48) return `před ${h} h`;
  return `před ${Math.round(h / 24)} dny`;
}

export default async function ProjectsPage() {
  let projects: VercelProject[] | null = null;
  let error: string | null = null;
  try {
    projects = await listVercelProjects();
  } catch (err) {
    error = (err as Error).message;
  }

  return (
    <PageContainer wide>
      <PageHeader
        eyebrow="Hosting"
        title="Projekty"
        subtitle="Přehled projektů na Vercelu"
      />

      {error ? (
        <Card className="gap-2 p-6 text-sm">
          <p className="text-muted-foreground">Nepodařilo se načíst projekty:</p>
          <p className="font-mono text-xs text-destructive">{error}</p>
          <p className="mt-2 text-muted-foreground">
            Vytvoř token na{" "}
            <a
              href="https://vercel.com/account/tokens"
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline"
            >
              vercel.com/account/tokens
            </a>{" "}
            a vlož ho do <span className="font-mono">.env</span> jako{" "}
            <span className="font-mono">VERCEL_TOKEN</span> (u týmu i{" "}
            <span className="font-mono">VERCEL_TEAM_ID</span>).
          </p>
        </Card>
      ) : projects && projects.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Žádné projekty na účtu.
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {projects?.map((p) => (
            <Card key={p.id} className="gap-3 p-5">
              <div className="flex items-start justify-between gap-2">
                <a
                  href={p.dashboardUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-heading text-base font-semibold tracking-tight hover:text-primary"
                >
                  {p.name}
                </a>
                <span
                  className={`shrink-0 border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${stateClass(
                    p.state,
                  )}`}
                >
                  {stateLabel(p.state)}
                </span>
              </div>

              <dl className="space-y-1 font-mono text-xs text-muted-foreground">
                <div className="flex justify-between gap-2">
                  <dt>Framework</dt>
                  <dd className="text-foreground">{p.framework ?? "—"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Repozitář</dt>
                  <dd className="truncate text-foreground">{p.repo ?? "—"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Poslední deploy</dt>
                  <dd className="text-foreground">{ago(p.deployedAt) || "—"}</dd>
                </div>
              </dl>

              {p.url && (
                <a
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate font-mono text-xs text-primary hover:underline"
                >
                  {p.url.replace(/^https?:\/\//, "")}
                </a>
              )}
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
