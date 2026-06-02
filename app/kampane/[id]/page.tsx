import { notFound } from "next/navigation";
import Link from "next/link";
import { ActionButton } from "@/components/action-button";
import { LeadsWorkspace } from "@/components/leads-workspace";
import { PageContainer, PageHeader } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { getCampaignWithLeads } from "@/db/queries";
import { LEAD_STATUS_LABEL, LEAD_STATUS_ORDER } from "@/lib/leadStatus";
import type { LeadStatus } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const campaign = await getCampaignWithLeads(id);
  if (!campaign) notFound();

  const leads = campaign.leads;
  const counts = leads.reduce<Record<string, number>>((acc, l) => {
    acc[l.status] = (acc[l.status] ?? 0) + 1;
    return acc;
  }, {});
  const activeCounts = LEAD_STATUS_ORDER.filter((s) => counts[s]);

  return (
    <PageContainer>
      <div className="mb-2">
        <Link href="/kampane" className="font-mono text-xs text-muted-foreground hover:text-primary">
          ← Kampaně
        </Link>
      </div>
      <PageHeader
        eyebrow={`${campaign.vertical} · ${campaign.region}`}
        title={campaign.name}
        subtitle={`${leads.length} leadů`}
        actions={
          <>
            <ActionButton
              endpoint={`/api/campaigns/${campaign.id}/discover`}
              successMessage="Discovery hotové"
              variant="default"
            >
              Discover
            </ActionButton>
            <ActionButton
              endpoint={`/api/campaigns/${campaign.id}/triage`}
              successMessage="Triáž hotová"
            >
              Triáž všech
            </ActionButton>
          </>
        }
      />

      {activeCounts.length > 0 && (
        <Card className="mb-6 flex flex-row flex-wrap gap-x-6 gap-y-2 p-4">
          {activeCounts.map((s) => (
            <div key={s} className="flex items-center gap-2">
              <span className="font-mono text-lg tabular-nums text-primary">
                {counts[s]}
              </span>
              <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                {LEAD_STATUS_LABEL[s as LeadStatus]}
              </span>
            </div>
          ))}
        </Card>
      )}

      {leads.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Zatím žádné leady. Klikni na <strong>Discover</strong> — natáhne firmy
          z OpenStreetMap podle filtrů kampaně.
        </Card>
      ) : (
        <LeadsWorkspace leads={leads} />
      )}
    </PageContainer>
  );
}
