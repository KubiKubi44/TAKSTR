"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { EditTaskDialog } from "@/components/edit-task-dialog";
import { TaskRow, type TaskItem } from "@/components/task-row";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { PRIORITY_BAR, PRIORITY_LABEL } from "@/lib/taskMeta";
import { cn } from "@/lib/utils";

export interface KanbanGroups {
  overdue: TaskItem[];
  today: TaskItem[];
  week: TaskItem[];
  later: TaskItem[];
  none: TaskItem[];
  done: TaskItem[];
}

const COLUMNS: { key: keyof KanbanGroups; label: string; droppable: boolean; danger?: boolean }[] = [
  { key: "overdue", label: "Po termínu", droppable: false, danger: true },
  { key: "today", label: "Dnes", droppable: true },
  { key: "week", label: "Tento týden", droppable: true },
  { key: "later", label: "Později", droppable: true },
  { key: "none", label: "Bez termínu", droppable: true },
];

// cílové datum pro přetažení do sloupce (undefined = sloupec nepřeplánovává)
function targetDue(key: string): string | null | undefined {
  const d = new Date();
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
  if (key === "none") return null;
  if (key === "today") return start.toISOString();
  if (key === "week") {
    start.setDate(start.getDate() + 3);
    return start.toISOString();
  }
  if (key === "later") {
    start.setDate(start.getDate() + 8);
    return start.toISOString();
  }
  return undefined;
}

function TaskCard({ task }: { task: TaskItem }) {
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

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/task", task.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className="glass glass-hover group/card relative cursor-grab overflow-hidden rounded-xl p-3 pl-4 active:cursor-grabbing"
    >
      <span
        className={cn("absolute inset-y-2 left-1.5 w-0.5 rounded-full", PRIORITY_BAR[task.priority])}
        title={`Priorita: ${PRIORITY_LABEL[task.priority]}`}
      />
      <div className="flex items-start gap-2">
        <Checkbox checked={task.done} onCheckedChange={toggle} aria-label="Hotovo" className="mt-0.5" />
        <span className="min-w-0 flex-1 text-sm leading-snug">{task.title}</span>
      </div>

      {(task.project || task.lead) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
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
        </div>
      )}
      {task.note && <p className="mt-1.5 truncate text-xs text-muted-foreground">{task.note}</p>}

      <div className="mt-2 flex items-center justify-between">
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
          {task.dueAt
            ? new Date(task.dueAt).toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" })
            : ""}
        </span>
        <div className="flex items-center opacity-0 transition-opacity group-hover/card:opacity-100">
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
    </div>
  );
}

export function TaskKanban({ groups }: { groups: KanbanGroups }) {
  const router = useRouter();
  const [over, setOver] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);

  async function handleDrop(colKey: string, id: string) {
    setOver(null);
    const due = targetDue(colKey);
    if (due === undefined || !id) return; // Po termínu nepřeplánovává
    await fetch(`/api/tasks/${id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ dueAt: due }),
    });
    router.refresh();
  }

  return (
    <div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {COLUMNS.map((col) => {
          const items = groups[col.key];
          return (
            <div
              key={col.key}
              onDragOver={(e) => {
                if (!col.droppable) return;
                e.preventDefault();
                setOver(col.key);
              }}
              onDragLeave={() => setOver((o) => (o === col.key ? null : o))}
              onDrop={(e) => {
                if (!col.droppable) return;
                handleDrop(col.key, e.dataTransfer.getData("text/task"));
              }}
              className={cn(
                "w-64 shrink-0 rounded-2xl p-1 transition-colors",
                over === col.key && "bg-foreground/5 ring-1 ring-foreground/15",
              )}
            >
              <div className="mb-2 flex items-center justify-between px-2 pt-1">
                <span
                  className={cn(
                    "font-mono text-[11px] font-semibold uppercase tracking-widest",
                    col.danger ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  {col.label}
                </span>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">{items.length}</span>
              </div>
              <div className="space-y-2">
                {items.map((t) => (
                  <TaskCard key={t.id} task={t} />
                ))}
                {items.length === 0 && (
                  <div className="rounded-xl border border-dashed border-border/60 px-3 py-6 text-center text-xs text-muted-foreground/60">
                    {col.droppable ? "přetáhni sem" : "—"}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {groups.done.length > 0 && (
        <Card className="mt-4 gap-2 p-5">
          <button
            type="button"
            onClick={() => setShowDone((s) => !s)}
            className="flex items-center gap-2 font-heading text-sm font-semibold text-muted-foreground"
          >
            {showDone ? "▾" : "▸"} Hotovo ({groups.done.length})
          </button>
          {showDone && (
            <div className="divide-y divide-white/8 opacity-60">
              {groups.done.map((t) => (
                <TaskRow key={t.id} task={t} />
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
