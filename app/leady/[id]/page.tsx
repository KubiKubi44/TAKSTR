import { notFound } from "next/navigation";
import Link from "next/link";
import { ActionButton } from "@/components/action-button";
import { CreateProjectButton } from "@/components/create-project-button";
import { DraftGenerate } from "@/components/draft-generate";
import { LeadFlags } from "@/components/lead-flags";
import { NewEventDialog } from "@/components/new-event-dialog";
import { NoteForm } from "@/components/note-form";
import { QuickAddTask } from "@/components/quick-add-task";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/page-shell";
import { OpportunityBadge } from "@/components/opportunity-badge";
import { ScoreBadge } from "@/components/score-badge";
import { StatusBadge } from "@/components/status-badge";
import { computeOpportunity } from "@/lib/opportunity";
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

const DELIVERY_LABEL: Record<string, string> = {
  sent: "Odesláno",
  delayed: "Zdrženo",
  delivered: "Doručeno",
  opened: "Otevřeno",
  clicked: "Prokliknuto",
  bounced: "Nedoručeno",
  complained: "Spam",
  replied: "Odpovězeno",
};

function deliveryTone(status: string | null): string {
  if (status === "bounced" || status === "complained") return "text-destructive";
  if (status === "opened" || status === "clicked" || status === "replied") return "text-primary";
  if (status === "delivered") return "text-foreground";
  return "text-muted-foreground";
}

function fmtDate(v: unknown): string {
  if (typeof v !== "string") return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString("cs-CZ");
}

function stars(rating: unknown): string {
  if (typeof rating !== "number") return "—";
  const full = Math.round(rating);
  return `${"★".repeat(full)}${"☆".repeat(Math.max(0, 5 - full))} ${rating.toFixed(1)}`;
}

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
    if (event === "project_created") return "Založen projekt z leadu";
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
  const opp = computeOpportunity({
    score: lead.score,
    flags: lead.flags,
    enrichment: lead.enrichment as Record<string, unknown>,
    contactEmail: lead.contactEmail,
    phone: lead.phone,
  });

  return (
    <PageContainer wide>
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
        {latestDraft && (
          <ActionButton
            endpoint={`/api/leads/${lead.id}/send`}
            successMessage="Odesláno"
            variant="default"
            disabled={latestDraft.status === "sent" || latestDraft.status === "discarded"}
            confirm={`Odeslat draft v${latestDraft.version} na ${
              latestDraft.recipientEmail ?? lead.contactEmail ?? "(chybí příjemce!)"
            }? E-mail reálně odejde přes Resend.`}
          >
            Odeslat
          </ActionButton>
        )}
        <ActionButton
          endpoint={`/api/leads/${lead.id}/replied`}
          successMessage="Označeno jako odpovězeno"
          disabled={lead.status !== "sent"}
        >
          Označit odpovězeno
        </ActionButton>
        <ActionButton
          endpoint={`/api/leads/${lead.id}/enrich`}
          successMessage="Obohaceno z ARES / hodnocení"
        >
          Obohatit
        </ActionButton>
        <div className="mx-1 h-5 w-px self-center bg-border" />
        <CreateProjectButton leadId={lead.id} />
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
          <Card className="gap-3 p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-heading text-sm font-semibold">Příležitost</h2>
              <OpportunityBadge opp={opp} />
            </div>
            <div className="space-y-2">
              <OppBar label="Potřeba" value={opp.need} />
              <OppBar label="Bonita" value={opp.money} />
              <OppBar label="Dosažitelnost" value={opp.reach} />
            </div>
            {opp.reasons.length > 0 && (
              <p className="text-xs text-muted-foreground">{opp.reasons.join(" · ")}</p>
            )}
            {!opp.moneyKnown && (
              <p className="text-[11px] text-muted-foreground">
                Klikni „Obohatit“ — bez bonity (ARES + hodnocení) je skóre jen odhad.
              </p>
            )}
          </Card>

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

          {(() => {
            const e = lead.enrichment as Record<string, unknown>;
            const has = e && (e.ico || typeof e.rating === "number");
            if (!has) return null;
            const nace = Array.isArray(e.nace) ? (e.nace as string[]) : [];
            return (
              <Card className="gap-2 p-5">
                <h2 className="font-heading text-sm font-semibold">Firma &amp; hodnocení</h2>
                <dl className="space-y-1 text-sm">
                  {typeof e.rating === "number" && (
                    <Row
                      k="Hodnocení"
                      v={`${stars(e.rating)}${typeof e.reviews === "number" ? ` (${e.reviews})` : ""}`}
                    />
                  )}
                  {e.ico ? <Row k="IČO" v={String(e.ico)} /> : null}
                  {e.legalForm ? <Row k="Forma" v={String(e.legalForm)} /> : null}
                  {e.foundedAt ? <Row k="Vznik" v={fmtDate(e.foundedAt)} /> : null}
                  {e.address ? <Row k="Sídlo" v={String(e.address)} /> : null}
                  {nace.length > 0 ? <Row k="NACE" v={nace.slice(0, 4).join(", ")} /> : null}
                  {e.aresName ? <Row k="Rejstřík" v={String(e.aresName)} /> : null}
                </dl>
                {e.ico ? (
                  <a
                    href={`https://ares.gov.cz/ekonomicke-subjekty?ico=${e.ico}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block font-mono text-xs text-primary hover:underline"
                  >
                    Otevřít v ARES ↗
                  </a>
                ) : null}
              </Card>
            );
          })()}

          <Card className="gap-2 p-5">
            <h2 className="font-heading text-sm font-semibold">
              Signály {lead.analyses.length > 1 && `(${lead.analyses.length} analýz)`}
            </h2>
            {!analysis ? (
              <p className="text-sm text-muted-foreground">
                Zatím nezanalyzováno.
              </p>
            ) : (
              (() => {
                const sig = analysis.signals as Record<string, unknown>;
                const n = (v: unknown) => (typeof v === "number" ? v : null);
                const sslDays = n(sig.sslDaysLeft);
                const domDays = n(sig.domainDaysLeft);
                const httpsOk = sig.httpsOk === true;
                const gen = typeof sig.generator === "string" ? sig.generator : null;
                const year = n(sig.footerYear);
                return (
                  <dl className="space-y-1 text-sm">
                    <Row k="Builder / stack" v={analysis.builder ?? gen ?? "neznámý"} />
                    <Row k="Mobilní (viewport)" v={analysis.mobileOk ? "ano" : "NE"} />
                    <Row
                      k="HTTPS / SSL"
                      v={
                        !httpsOk
                          ? "NE"
                          : sslDays != null
                            ? `ano (${sslDays} dní)`
                            : "ano"
                      }
                    />
                    {domDays != null && (
                      <Row k="Doména vyprší" v={`za ${domDays} dní`} />
                    )}
                    {year != null && <Row k="Rok v patičce" v={String(year)} />}
                    <Row k="Anglická verze" v={analysis.hasEn ? "ano" : "ne"} />
                    <Row k="PageSpeed" v={analysis.pagespeed?.toString() ?? "neměřeno"} />
                    <Row k="Délka textu" v={`${analysis.textExcerpt?.length ?? 0} zn.`} />
                    <Row k="Analyzováno" v={fmt(analysis.analyzedAt)} />
                  </dl>
                );
              })()
            )}
          </Card>

          {(() => {
            const sends = lead.outreach.filter((o) => o.direction === "outbound");
            if (sends.length === 0) return null;
            return (
              <Card className="gap-2 p-5">
                <h2 className="font-heading text-sm font-semibold">Doručení</h2>
                <ul className="space-y-2 text-sm">
                  {sends.map((o) => (
                    <li key={o.id} className="flex items-center justify-between gap-2">
                      <span className="w-20 shrink-0 font-mono text-xs text-muted-foreground">
                        {o.sentAt ? fmt(o.sentAt) : "—"}
                      </span>
                      <span
                        className={`font-mono text-[10px] uppercase tracking-wider ${deliveryTone(o.status)}`}
                      >
                        {DELIVERY_LABEL[o.status ?? ""] ?? o.status ?? "—"}
                      </span>
                      <span className="flex-1 truncate text-right font-mono text-xs text-muted-foreground">
                        {o.openedAt ? "👁 otevřel" : o.deliveredAt ? "doručeno" : ""}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-1 text-[11px] text-muted-foreground/70">
                  Stavy se aktualizují přes Resend webhook (doručeno / otevřeno / odmítnuto).
                </p>
              </Card>
            );
          })()}

          <Card className="gap-3 p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-heading text-sm font-semibold">
                Schůzky &amp; follow-upy
              </h2>
              <NewEventDialog
                presetLeadId={lead.id}
                presetLeadName={lead.businessName}
                trigger={
                  <Button size="sm" variant="outline">
                    + Naplánovat
                  </Button>
                }
              />
            </div>
            {lead.events.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Žádné naplánované události.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {lead.events.map((e) => (
                  <li key={e.id} className="flex items-center gap-2">
                    <span className="w-24 shrink-0 font-mono text-xs text-muted-foreground">
                      {fmt(e.startAt)}
                    </span>
                    <span
                      className={
                        e.kind === "meeting"
                          ? "font-mono text-[10px] uppercase tracking-wider text-primary"
                          : "font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
                      }
                    >
                      {e.kind === "meeting" ? "schůzka" : "follow-up"}
                    </span>
                    <span className={e.done ? "line-through opacity-60" : ""}>
                      {e.title}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="gap-3 p-5">
            <h2 className="font-heading text-sm font-semibold">Rychlý úkol</h2>
            <QuickAddTask leadId={lead.id} />
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

function OppBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-24 shrink-0 text-muted-foreground">{label}</span>
      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <span
          className="block h-full bg-primary"
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </span>
      <span className="w-7 text-right font-mono tabular-nums text-muted-foreground">{value}</span>
    </div>
  );
}
