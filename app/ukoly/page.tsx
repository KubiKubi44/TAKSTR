import { AddTask } from "@/components/add-task";
import { PageContainer, PageHeader } from "@/components/page-shell";
import { TaskRow } from "@/components/task-row";
import { Card } from "@/components/ui/card";
import { getTasks } from "@/db/queries";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const tasks = await getTasks();
  const active = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  return (
    <PageContainer>
      <PageHeader eyebrow="Práce" title="Úkoly" />

      <Card className="p-4">
        <AddTask />
      </Card>

      <Card className="mt-4 gap-2 p-5">
        <h2 className="mb-1 font-heading text-sm font-semibold">
          Aktivní ({active.length})
        </h2>
        {active.length === 0 ? (
          <p className="text-sm text-muted-foreground">Žádné úkoly. 🎉</p>
        ) : (
          <div className="divide-y divide-white/8">
            {active.map((t) => (
              <TaskRow key={t.id} task={t} />
            ))}
          </div>
        )}
      </Card>

      {done.length > 0 && (
        <Card className="mt-4 gap-2 p-5">
          <h2 className="mb-1 font-heading text-sm font-semibold text-muted-foreground">
            Hotovo ({done.length})
          </h2>
          <div className="divide-y divide-white/8 opacity-60">
            {done.map((t) => (
              <TaskRow key={t.id} task={t} />
            ))}
          </div>
        </Card>
      )}
    </PageContainer>
  );
}
