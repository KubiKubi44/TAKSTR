import { CalendarView } from "@/components/calendar-view";
import { NewEventDialog } from "@/components/new-event-dialog";
import { PageContainer, PageHeader } from "@/components/page-shell";
import { listCalendarEvents, listLeads } from "@/db/queries";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const [events, leads] = await Promise.all([listCalendarEvents(), listLeads()]);
  const leadOptions = leads.map((l) => ({ id: l.id, businessName: l.businessName }));

  return (
    <PageContainer wide>
      <PageHeader
        eyebrow="Plán"
        title="Kalendář"
        actions={<NewEventDialog />}
      />
      <CalendarView events={events} leads={leadOptions} />
    </PageContainer>
  );
}
