import { notFound } from "next/navigation";
import Link from "next/link";
import { ActionButton } from "@/components/action-button";
import { DraftGenerate } from "@/components/draft-generate";
import { LeadFlags } from "@/components/lead-flags";
import { NoteForm } from "@/components/note-form";
import { PageContainer } from "@/components/page-shell";
import { ScoreBadge } from "@/components/score-badge";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getLeadWithRelations } from "@/db/queries";
import { LEAD_STATUS_LABEL } from "@/lib/leadStatus";

const DRAFT_STATUS_LABEL: Record<string, string> = {
  draft: "Návrh",
  approved: "Schváleno",
  sent: "Odesláno",
  discarded: "Zahozeno",
};

function fmt(d: Date | string): string {
  return new Date(d).toLocaleString("cs-CZ", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function activityText(type: string, payload: Record<string, unknown>): string {
  if (type === "status_change") {
    const to = payload.to as string;
    const from = payload.from as string | null;
    const label = LEAD_STATUS_LABEL[to as keyof typeof LEAD_STATUS_LABEL] ?? to;
    return from ? `Stav → ${label}` : `Stav: ${label}`;
  }
  if (type === "note") {
    if (typeof payload.text === "string") return payload.text;
    const event = payload.event as string | undefined;
    if (event === "discovered") return "Objeveno přes OpenStreetMap";
    if (event === "triage_skipped") return "Triáž přeskočena (jen sociální síť)";
    if (event === "triage_failed") return "Triáž selhala (web nedostupný)";
    if (event === "analyze_failed") return "Analýza selhala (web nedostupný)";
    if (event === "draft_approved") return `Draft v${payload.version} schválen`;
    return "Poznámka";
  }
  if (type === "email_sent") return "E-mail odeslán";
  if (type === "reply") return "Příchozí odpověď";
  if (type === "call") return "Telefonát";
  return type;
}

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await getLeadWithRelations(id);
  if (!lead) notFound();

  const analysis = lead.analyses[0];
  const latestDraft = lead.drafts.at(-1);

  return (
    <PageContainer>
      <div className="mb-2">
        <Link href="/leady" className="font-mono text-xs text-muted-foreground hover:text-primary">
          ← Leady
        </Link>
      </div>

      {/* hlavička */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <StatusBadge status={lead.status} />
            <ScoreBadge score={lead.score} />
          </div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {lead.businessName}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <a href={lead.websiteUrl} target="_blank" rel="noreferrer" className="font-mono hover:text-primary">
              {lead.websiteUrl}
            </a>
            <LeadFlags flags={lead.flags} />
          </div>
        </div>
      </div>

      {/* akce */}
      <Card className="mb-6 flex flex-row flex-wrap items-center gap-2 p-3">
        <ActionButton endpoint={`/api/leads/${lead.id}/analyze`} successMessage="Analýza hotová">
          Analyzovat
        </ActionButton>
        <DraftGenerate leadId={lead.id} hasDraft={lead.drafts.length > 0} />
        {latestDraft && (
          <ActionButton
            endpoint={`/api/drafts/${latestDraft.id}/approve`}
            successMessage="Draft schválen"
            disabled={latestDraft.status === "approved" || latestDraft.status === "sent"}
          >
            Schválit
          </ActionButton>
        )}
        <Button size="sm" variant="ghost" disabled title="Fáze 6 — Resend">
          Odeslat
        </Button>
        <Button size="sm" variant="ghost" disabled title="Fáze 6">
          Označit odpovězeno
        </Button>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* levý sloupec: drafty + timeline */}
        <div className="space-y-6 lg:col-span-2">
          <section>
            <h2 className="mb-3 font-heading text-sm font-semibold">
              Drafty {lead.drafts.length > 0 && `(${lead.drafts.length})`}
            </h2>
            {lead.drafts.length === 0 ? (
              <Card className="p-5 text-sm text-muted-foreground">
                Zatím žádný draft. Po analýze klikni na „Generovat draft“.
              </Card>
            ) : (
              <div className="space-y-3">
                {[...lead.drafts].reverse().map((d) => (
                  <Card key={d.id} className="gap-2 p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                        verze {d.version} · {DRAFT_STATUS_LABEL[d.status] ?? d.status}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {fmt(d.createdAt)}
                      </span>
                    </div>
                    {d.editInstruction && (
                      <p className="border-l-2 border-primary/40 pl-2 text-xs italic text-muted-foreground">
                        Úprava: {d.editInstruction}
                      </p>
                    )}
                    <p className="font-medium">{d.subject}</p>
                    <Separator />
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/90">
                      {d.body}
                    </pre>
                    <p className="font-mono text-xs text-muted-foreground">
                      → {d.recipientEmail ?? "(bez příjemce)"} · {d.model}
                    </p>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 font-heading text-sm font-semibold">Časová osa</h2>
            <Card className="p-5">
              <ol className="space-y-3">
                {lead.activities.map((a) => (
                  <li key={a.id} className="flex gap-3 text-sm">
                    <span className="w-24 shrink-0 font-mono text-xs text-muted-foreground">
                      {fmt(a.createdAt)}
                    </span>
                    <span className="flex-1">
                      {activityText(a.type, a.payload)}
                    </span>
                    <span className="font-mono text-[10px] uppercase text-muted-foreground/60">
                      {a.actor}
                    </span>
                  </li>
                ))}
              </ol>
            </Card>
          </section>
        </div>

        {/* pravý sloupec: kontakt + signály + poznámka */}
        <div className="space-y-6">
          <Card className="gap-2 p-5">
            <h2 className="font-heading text-sm font-semibold">Kontakt</h2>
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">E-mail</dt>
                <dd className="font-mono text-xs">{lead.contactEmail ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Telefon</dt>
                <dd className="font-mono text-xs">{lead.phone ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Kampaň</dt>
                <dd className="text-xs">{lead.campaign?.name}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Zdroj</dt>
                <dd className="font-mono text-xs">{lead.source}</dd>
              </div>
            </dl>
          </Card>

          <Card className="gap-2 p-5">
            <h2 className="font-heading text-sm font-semibold">
              Signály {lead.analyses.length > 1 && `(${lead.analyses.length} analýz)`}
            </h2>
            {!analysis ? (
              <p className="text-sm text-muted-foreground">
                Zatím nezanalyzováno.
              </p>
            ) : (
              <dl className="space-y-1 text-sm">
                <Row k="Builder" v={analysis.builder ?? "neznámý"} />
                <Row k="Mobilní (viewport)" v={analysis.mobileOk ? "ano" : "NE"} />
                <Row k="Anglická verze" v={analysis.hasEn ? "ano" : "ne"} />
                <Row k="PageSpeed" v={analysis.pagespeed?.toString() ?? "neměřeno"} />
                <Row
                  k="Délka textu"
                  v={`${analysis.textExcerpt?.length ?? 0} zn.`}
                />
                <Row k="Analyzováno" v={fmt(analysis.analyzedAt)} />
              </dl>
            )}
          </Card>

          <Card className="gap-3 p-5">
            <h2 className="font-heading text-sm font-semibold">Poznámka</h2>
            <NoteForm leadId={lead.id} />
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
      <dd className="font-mono text-xs">{v}</dd>
    </div>
  );
}
