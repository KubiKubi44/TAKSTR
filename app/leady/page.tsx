import { LeadsWorkspace } from "@/components/leads-workspace";
import { PageContainer, PageHeader } from "@/components/page-shell";
import { listLeads } from "@/db/queries";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const leads = await listLeads();

  return (
    <PageContainer>
      <PageHeader eyebrow="Pipeline" title="Leady" />
      <LeadsWorkspace leads={leads} showCampaign />
    </PageContainer>
  );
}
