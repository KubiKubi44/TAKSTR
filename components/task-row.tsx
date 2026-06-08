"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { EditTaskDialog } from "@/components/edit-task-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { isPast } from "@/lib/time";
import { PRIORITY_DOT, PRIORITY_LABEL } from "@/lib/taskMeta";
import { cn } from "@/lib/utils";
import type { TaskPriority } from "@/db/schema";

export interface TaskItem {
  id: string;
  title: string;
  done: boolean;
  priority: TaskPriority;
  assignee: string | null;
  dueAt: string | Date | null;
  note: string | null;
  lead: { id: string; businessName: string } | null;
  project: { id: string; name: string | null; vercelProjectId: string | null } | null;
}

export function TaskRow({ task }: { task: TaskItem }) {
  const router = useRouter();

  async function toggle() {
    await fetch(`/api/tasks/${task.id}/toggle`, { method: "POST" });
    router.refresh();
  }
  async function remove() {
    const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
    else toast.error("Nepovedlo se");
  }

  const overdue = !task.done && isPast(task.dueAt);

  return (
    <div className="group/task flex items-center gap-2.5 py-2">
      <span
        className={cn("size-2 shrink-0 rounded-full", PRIORITY_DOT[task.priority])}
        title={`Priorita: ${PRIORITY_LABEL[task.priority]}`}
      />
      <Checkbox checked={task.done} onCheckedChange={toggle} aria-label="Hotovo" />
      <div className="min-w-0 flex-1">
        <span className={cn("text-sm", task.done && "text-muted-foreground line-through")}>
          {task.title}
        </span>
        {(task.project || task.lead || task.note) && (
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {task.project && (
              <Link
                href={`/projekty/${task.project.vercelProjectId ?? task.project.id}`}
                className="border border-border px-1 hover:text-primary"
              >
                {task.project.name ?? "projekt"}
              </Link>
            )}
            {task.lead && (
              <Link href={`/leady/${task.lead.id}`} className="border border-border px-1 hover:text-primary">
                {task.lead.businessName}
              </Link>
            )}
            {task.note && <span className="truncate">{task.note}</span>}
          </div>
        )}
      </div>
      {task.dueAt && (
        <span className={cn("shrink-0 font-mono text-xs", overdue ? "text-destructive" : "text-muted-foreground")}>
          {new Date(task.dueAt).toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" })}
        </span>
      )}
      <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover/task:opacity-100">
        <EditTaskDialog task={task} />
        <Button
          size="icon-sm"
          variant="ghost"
          className="text-muted-foreground hover:text-destructive"
          onClick={remove}
          aria-label="Smazat"
        >
          ✕
        </Button>
      </div>
    </div>
  );
}
