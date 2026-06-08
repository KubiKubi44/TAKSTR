import Link from "next/link";
import { NewCampaignDialog } from "@/components/new-campaign-dialog";
import { PageContainer, PageHeader } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { getCampaignsWithCounts } from "@/db/queries";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, string> = {
  active: "text-success",
  paused: "text-gold",
  done: "text-muted-foreground/70",
};

export default async function CampaignsPage() {
  const campaigns = await getCampaignsWithCounts();

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Segmenty"
        title="Kampaně"
        actions={<NewCampaignDialog />}
      />

      {campaigns.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Zatím žádné kampaně. Založ první přes „+ Nová kampaň“.
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {campaigns.map((c) => (
            <Link key={c.id} href={`/kampane/${c.id}`}>
              <Card className="gap-2 p-5 transition-colors hover:border-primary/50">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-heading text-lg font-semibold tracking-tight">
                    {c.name}
                  </h2>
                  <span className="font-mono text-2xl tabular-nums text-info">
                    {c.leadCount}
                  </span>
                </div>
                <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  {c.vertical} · {c.region} ·{" "}
                  <span className={STATUS_TONE[c.status] ?? ""}>{c.status}</span>
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
