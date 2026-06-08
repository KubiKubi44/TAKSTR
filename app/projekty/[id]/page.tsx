import { notFound } from "next/navigation";
import Link from "next/link";
import { BillingCard } from "@/components/billing-card";
import { ClientForm } from "@/components/client-form";
import { HealthBadge } from "@/components/health-badge";
import { PageContainer } from "@/components/page-shell";
import { ProjectCardActions } from "@/components/project-card-actions";
import { ProjectMetaForm } from "@/components/project-meta-form";
import { QuickAddTask } from "@/components/quick-add-task";
import { RedeployButton } from "@/components/redeploy-button";
import { Card } from "@/components/ui/card";
import { getProjectMeta, getProjectMetaById } from "@/db/queries";
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
  if (state === "READY") return "border-success/40 text-success";
  if (state === "ERROR" || state === "CANCELED") return "border-destructive/50 text-destructive";
  if (state === "BUILDING" || state === "QUEUED") return "border-info/40 text-info";
  return "border-border text-muted-foreground";
}
const czk = (n: number | null | undefined) =>
  n || n === 0 ? `${n.toLocaleString("cs-CZ")} Kč` : "—";

function PricesCard({
  projectId,
  meta,
}: {
  projectId: string;
  meta: { buildPrice: number | null; monthlyPrice: number | null; note: string | null } | null | undefined;
}) {
  return (
    <Card className="gap-4 p-5">
      <h2 className="font-heading text-sm font-semibold">Ceny &amp; poznámky</h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="border border-border p-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Výrobní cena</p>
          <p className="mt-1 font-mono text-xl tabular-nums">{czk(meta?.buildPrice)}</p>
        </div>
        <div className="border border-border p-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Měsíční správa</p>
          <p className="mt-1 font-mono text-xl tabular-nums text-success">{czk(meta?.monthlyPrice)}</p>
        </div>
      </div>
      <ProjectMetaForm
        projectId={projectId}
        initial={{
          buildPrice: meta?.buildPrice ?? null,
          monthlyPrice: meta?.monthlyPrice ?? null,
          note: meta?.note ?? null,
        }}
      />
    </Card>
  );
}

function ClientCard({
  projectId,
  showUrl,
  meta,
}: {
  projectId: string;
  showUrl: boolean;
  meta: {
    clientName: string | null;
    clientEmail: string | null;
    clientPhone: string | null;
    url: string | null;
    leadId: string | null;
  } | null | undefined;
}) {
  return (
    <Card className="gap-3 p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-sm font-semibold">Klient</h2>
        {meta?.leadId && (
          <Link href={`/leady/${meta.leadId}`} className="font-mono text-xs text-primary hover:underline">
            ← původní lead
          </Link>
        )}
      </div>
      <ClientForm
        projectId={projectId}
        showUrl={showUrl}
        initial={{
          clientName: meta?.clientName ?? null,
          clientEmail: meta?.clientEmail ?? null,
          clientPhone: meta?.clientPhone ?? null,
          url: meta?.url ?? null,
        }}
      />
    </Card>
  );
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const isVercel = id.startsWith("prj_");

  // ── Ruční projekt ──
  if (!isVercel) {
    const meta = await getProjectMetaById(id);
    if (!meta) notFound();
    return (
      <PageContainer wide>
        <div className="mb-2">
          <Link href="/projekty" className="font-mono text-xs text-muted-foreground hover:text-primary">
            ← Projekty
          </Link>
        </div>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">{meta.name ?? "—"}</h1>
            <span className="border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              ruční
            </span>
            {meta.url && <HealthBadge url={meta.url} />}
          </div>
          <div className="flex items-center gap-3 font-mono text-xs">
            {meta.url && (
              <a href={meta.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                Otevřít web ↗
              </a>
            )}
            <ProjectCardActions
              id={meta.id}
              isVercel={false}
              hidden={meta.hidden}
              redirect="/projekty"
              currentName={meta.name ?? ""}
            />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <PricesCard projectId={meta.id} meta={meta} />
            <BillingCard
              projectId={meta.id}
              projectName={meta.name ?? ""}
              nextInvoiceAt={meta.nextInvoiceAt ? meta.nextInvoiceAt.toISOString() : null}
            />
          </div>
          <div className="space-y-6">
            <ClientCard projectId={meta.id} showUrl meta={meta} />
            <Card className="gap-3 p-5">
              <h2 className="font-heading text-sm font-semibold">Rychlý úkol</h2>
              <QuickAddTask projectId={meta.id} />
            </Card>
          </div>
        </div>
      </PageContainer>
    );
  }

  // ── Vercel projekt ──
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
  const displayName = meta?.name ?? project.name;

  return (
    <PageContainer wide>
      <div className="mb-2">
        <Link href="/projekty" className="font-mono text-xs text-muted-foreground hover:text-primary">
          ← Projekty
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">{displayName}</h1>
          {project.state && (
            <span className={`border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${stateBadge(project.state)}`}>
              {project.state.toLowerCase()}
            </span>
          )}
          {project.url && <HealthBadge url={project.url} />}
        </div>
        <div className="flex items-center gap-3 font-mono text-xs">
          {project.url && (
            <a href={project.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
              Otevřít web ↗
            </a>
          )}
          <a href={project.analyticsUrl} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary">
            Analytics ↗
          </a>
          <a href={project.dashboardUrl} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary">
            Vercel ↗
          </a>
          <RedeployButton projectId={project.id} />
          <ProjectCardActions
            id={project.id}
            isVercel
            hidden={meta?.hidden ?? false}
            redirect="/projekty"
            currentName={displayName}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <PricesCard projectId={project.id} meta={meta} />
          <BillingCard
            projectId={project.id}
            projectName={displayName}
            nextInvoiceAt={meta?.nextInvoiceAt ? meta.nextInvoiceAt.toISOString() : null}
          />
        </div>

        <div className="space-y-6">
          <ClientCard projectId={project.id} showUrl={false} meta={meta} />
          {meta?.id && (
            <Card className="gap-3 p-5">
              <h2 className="font-heading text-sm font-semibold">Rychlý úkol</h2>
              <QuickAddTask projectId={meta.id} />
            </Card>
          )}
          <Card className="gap-2 p-5">
            <h2 className="mb-2 font-heading text-sm font-semibold">Vercel</h2>
            <dl className="space-y-1 text-sm">
              <Row k="Framework" v={project.framework ?? "—"} />
              <Row k="Repozitář" v={project.repo ?? "—"} />
              <Row k="Poslední deploy" v={ago(project.deployedAt)} />
            </dl>
            <a
              href={project.analyticsUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block font-mono text-xs text-primary hover:underline"
            >
              Otevřít Vercel Analytics ↗
            </a>
          </Card>

          {project.domains.length > 0 && (
            <Card className="gap-2 p-5">
              <h2 className="font-heading text-sm font-semibold">Domény</h2>
              <ul className="space-y-1 text-sm">
                {project.domains.map((d) => (
                  <li key={d.name} className="flex items-center justify-between gap-2">
                    <a
                      href={`https://${d.name}`}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate font-mono text-xs hover:text-primary"
                    >
                      {d.name}
                    </a>
                    <span
                      className={`shrink-0 font-mono text-[10px] uppercase tracking-wider ${d.verified ? "text-primary" : "text-muted-foreground"}`}
                    >
                      {d.verified ? "ověřeno" : "nenastaveno"}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card className="gap-3 p-5">
            <h2 className="font-heading text-sm font-semibold">Poslední deploye</h2>
            {project.deployments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Žádné deploye.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {project.deployments.map((d, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 font-mono text-xs text-muted-foreground">{ago(d.createdAt)}</span>
                    <span className={`font-mono text-[10px] uppercase tracking-wider ${stateBadge(d.state)}`}>
                      {d.state?.toLowerCase() ?? "—"}
                    </span>
                    {d.target === "production" && (
                      <span className="font-mono text-[10px] uppercase text-muted-foreground">prod</span>
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
