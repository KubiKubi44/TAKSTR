import { AddTask } from "@/components/add-task";
import { PageContainer, PageHeader } from "@/components/page-shell";
import { TaskKanban, type KanbanGroups } from "@/components/task-kanban";
import { Card } from "@/components/ui/card";
import { getTasksGrouped, listProjectMeta } from "@/db/queries";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const [g, meta] = await Promise.all([getTasksGrouped(), listProjectMeta()]);
  const projects = meta
    .filter((m) => !m.hidden && m.name)
    .map((m) => ({ id: m.id, name: m.name as string }));

  const groups = g as unknown as KanbanGroups;
  const activeCount =
    g.overdue.length + g.today.length + g.week.length + g.later.length + g.none.length;

  return (
    <PageContainer wide>
      <PageHeader
        eyebrow="Práce"
        title="Úkoly"
        subtitle={
          activeCount === 0
            ? "Žádné aktivní úkoly 🎉"
            : `${activeCount} aktivních${g.overdue.length ? ` · ${g.overdue.length} po termínu` : ""}`
        }
      />

      <Card className="mb-5 p-4">
        <AddTask projects={projects} />
      </Card>

      <TaskKanban groups={groups} />

      {/* fallback prázdný stav je řešen ve sloupcích kanbanu */}
      {activeCount === 0 && g.done.length === 0 && (
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Přidej první úkol výše.
        </p>
      )}
    </PageContainer>
  );
}
