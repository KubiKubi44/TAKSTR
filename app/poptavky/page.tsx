import { DemandList } from "@/components/demand-list";
import { PageContainer, PageHeader } from "@/components/page-shell";
import { listDemand } from "@/db/queries";

export const dynamic = "force-dynamic";

export default async function DemandPage() {
  const rows = await listDemand();
  const items = rows.map((r) => ({
    id: r.id,
    source: r.source,
    title: r.title,
    url: r.url,
    category: r.category,
    status: r.status,
    postedAt: r.postedAt ? r.postedAt.toISOString() : null,
    createdAt: r.createdAt,
  }));

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Teplá poptávka"
        title="Poptávky"
        subtitle="Veřejné poptávky „hledám web / e-shop“ z portálů. Reaguj rychle — konverze je mnohem vyšší než studené oslovení."
      />
      <DemandList items={items} />
    </PageContainer>
  );
}
