import { notFound } from "next/navigation";
import Link from "next/link";
import { PageContainer } from "@/components/page-shell";
import { ProjectMetaForm } from "@/components/project-meta-form";
import { Card } from "@/components/ui/card";
import { getProjectMeta } from "@/db/queries";
import { getVercelProject } from "@/lib/vercel";

export const dynamic = "force-dynamic";

function ago(ms: number | null): string {
  if (!ms) return "—";
  const min = Math.round((Date.now() - ms) / 60000);
  if (min < 60) return `před ${min} min`;
  const h = Math.round(min / 60);
  if (h < 48) return `před ${h} h`;
  return `před ${Math.round(h / 24)} dny`;
}

function stateBadge(state: string | null): string {
  if (state === "READY") return "border-primary/40 text-primary";
  if (state === "ERROR" || state === "CANCELED")
    return "border-destructive/50 text-destructive";
  return "border-border text-muted-foreground";
}

const czk = (n: number | null | undefined) =>
  n || n === 0 ? `${n.toLocaleString("cs-CZ")} Kč` : "—";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let project;
  try {
    project = await getVercelProject(id);
  } catch (err) {
    return (
      <PageContainer>
        <Card className="p-6 text-sm">
          <p className="font-mono text-xs text-destructive">{(err as Error).message}</p>
        </Card>
      </PageContainer>
    );
  }
  if (!project) notFound();

  const meta = await getProjectMeta(id);

  return (
    <PageContainer wide>
      <div className="mb-2">
        <Link href="/projekty" className="font-mono text-xs text-muted-foreground hover:text-primary">
          ← Projekty
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {project.name}
          </h1>
          {project.state && (
            <span
              className={`border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${stateBadge(
                project.state,
              )}`}
            >
              {project.state.toLowerCase()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 font-mono text-xs">
          {project.url && (
            <a href={project.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
              Otevřít web ↗
            </a>
          )}
          <a href={project.dashboardUrl} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary">
            Vercel ↗
          </a>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ceny + poznámky */}
        <div className="space-y-6">
          <Card className="gap-4 p-5">
            <h2 className="font-heading text-sm font-semibold">Ceny &amp; poznámky</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="border border-border p-3">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Výrobní cena
                </p>
                <p className="mt-1 font-mono text-xl tabular-nums">{czk(meta?.buildPrice)}</p>
              </div>
              <div className="border border-border p-3">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Měsíční správa
                </p>
                <p className="mt-1 font-mono text-xl tabular-nums text-primary">
                  {czk(meta?.monthlyPrice)}
                </p>
              </div>
            </div>
            <ProjectMetaForm
              projectId={project.id}
              projectName={project.name}
              initial={{
                buildPrice: meta?.buildPrice ?? null,
                monthlyPrice: meta?.monthlyPrice ?? null,
                note: meta?.note ?? null,
              }}
            />
          </Card>
        </div>

        {/* vercel info */}
        <div className="space-y-6">
          <Card className="gap-2 p-5">
            <h2 className="mb-2 font-heading text-sm font-semibold">Vercel</h2>
            <dl className="space-y-1 text-sm">
              <Row k="Framework" v={project.framework ?? "—"} />
              <Row k="Repozitář" v={project.repo ?? "—"} />
              <Row k="Poslední deploy" v={ago(project.deployedAt)} />
            </dl>
          </Card>

          <Card className="gap-3 p-5">
            <h2 className="font-heading text-sm font-semibold">Poslední deploye</h2>
            {project.deployments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Žádné deploye.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {project.deployments.map((d, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 font-mono text-xs text-muted-foreground">
                      {ago(d.createdAt)}
                    </span>
                    <span className={`font-mono text-[10px] uppercase tracking-wider ${stateBadge(d.state)}`}>
                      {d.state?.toLowerCase() ?? "—"}
                    </span>
                    {d.target === "production" && (
                      <span className="font-mono text-[10px] uppercase text-muted-foreground">
                        prod
                      </span>
                    )}
                    {d.url && (
                      <a href={d.url} target="_blank" rel="noreferrer" className="ml-auto truncate font-mono text-xs text-muted-foreground hover:text-primary">
                        {d.url.replace(/^https?:\/\//, "")}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="truncate font-mono text-xs">{v}</dd>
    </div>
  );
}
