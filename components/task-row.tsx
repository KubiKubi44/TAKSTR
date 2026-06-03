"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { isPast } from "@/lib/time";
import { cn } from "@/lib/utils";

export interface TaskItem {
  id: string;
  title: string;
  done: boolean;
  dueAt: string | Date | null;
  note: string | null;
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
    <div className="flex items-center gap-3 py-2">
      <Checkbox checked={task.done} onCheckedChange={toggle} aria-label="Hotovo" />
      <div className="min-w-0 flex-1">
        <span className={cn("text-sm", task.done && "text-muted-foreground line-through")}>
          {task.title}
        </span>
        {task.note && <p className="truncate text-xs text-muted-foreground">{task.note}</p>}
      </div>
      {task.dueAt && (
        <span className={cn("shrink-0 font-mono text-xs", overdue ? "text-destructive" : "text-muted-foreground")}>
          {new Date(task.dueAt).toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" })}
        </span>
      )}
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
  );
}
