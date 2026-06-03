import { AddTask } from "@/components/add-task";
import { PageContainer, PageHeader } from "@/components/page-shell";
import { TaskRow, type TaskItem } from "@/components/task-row";
import { Card } from "@/components/ui/card";
import { getTasksGrouped, listProjectMeta } from "@/db/queries";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const [g, meta] = await Promise.all([getTasksGrouped(), listProjectMeta()]);
  const projects = meta
    .filter((m) => !m.hidden && m.name)
    .map((m) => ({ id: m.id, name: m.name as string }));

  const groups = [
    { key: "overdue", label: "Po termínu", items: g.overdue, danger: true },
    { key: "today", label: "Dnes", items: g.today, danger: false },
    { key: "week", label: "Tento týden", items: g.week, danger: false },
    { key: "later", label: "Později", items: g.later, danger: false },
    { key: "none", label: "Bez termínu", items: g.none, danger: false },
  ];
  const activeCount = groups.reduce((s, x) => s + x.items.length, 0);

  return (
    <PageContainer>
      <PageHeader eyebrow="Práce" title="Úkoly" />

      <Card className="p-4">
        <AddTask projects={projects} />
      </Card>

      {activeCount === 0 ? (
        <Card className="mt-4 p-8 text-center text-sm text-muted-foreground">
          Žádné úkoly. 🎉
        </Card>
      ) : (
        <Card className="mt-4 gap-5 p-5">
          {groups.map(
            (grp) =>
              grp.items.length > 0 && (
                <div key={grp.key}>
                  <h2
                    className={`mb-1 font-heading text-sm font-semibold ${grp.danger ? "text-destructive" : ""}`}
                  >
                    {grp.label} ({grp.items.length})
                  </h2>
                  <div className="divide-y divide-white/8">
                    {grp.items.map((t) => (
                      <TaskRow key={t.id} task={t as unknown as TaskItem} />
                    ))}
                  </div>
                </div>
              ),
          )}
        </Card>
      )}

      {g.done.length > 0 && (
        <Card className="mt-4 gap-2 p-5">
          <h2 className="mb-1 font-heading text-sm font-semibold text-muted-foreground">
            Hotovo ({g.done.length})
          </h2>
          <div className="divide-y divide-white/8 opacity-60">
            {g.done.map((t) => (
              <TaskRow key={t.id} task={t as unknown as TaskItem} />
            ))}
          </div>
        </Card>
      )}
    </PageContainer>
  );
}
