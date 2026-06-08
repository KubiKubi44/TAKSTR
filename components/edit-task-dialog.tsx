"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ASSIGNEES, ASSIGNEE_LABEL, PRIORITIES, PRIORITY_LABEL } from "@/lib/taskMeta";
import type { TaskPriority } from "@/db/schema";

const NONE = "none";

export function EditTaskDialog({
  task,
}: {
  task: {
    id: string;
    title: string;
    dueAt: string | Date | null;
    priority: TaskPriority;
    assignee?: string | null;
  };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [due, setDue] = useState(
    task.dueAt
      ? (() => {
          const d = new Date(task.dueAt);
          const p = (n: number) => String(n).padStart(2, "0");
          return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
        })()
      : "",
  );
  const [priority, setPriority] = useState<string>(task.priority);
  const [assignee, setAssignee] = useState<string>(task.assignee ?? NONE);

  async function save() {
    if (!title.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          dueAt: due || null,
          priority,
          assignee: assignee !== NONE ? assignee : null,
        }),
      });
      if (!res.ok) {
        toast.error("Nepovedlo se");
        return;
      }
      toast.success("Uloženo");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button size="icon-sm" variant="ghost" className="text-muted-foreground hover:text-foreground" aria-label="Upravit" />}
      >
        ✎
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Upravit úkol</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="t-title">Název</Label>
            <Input id="t-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Termín</Label>
              <DatePicker value={due} onChange={setDue} className="w-full" />
            </div>
            <div className="grid gap-1.5">
              <Label>Priorita</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v ?? "normal")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {PRIORITY_LABEL[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Pro koho</Label>
            <Select value={assignee} onValueChange={(v) => setAssignee(v ?? NONE)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Nepřiřazeno" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Nepřiřazeno</SelectItem>
                {ASSIGNEES.map((a) => (
                  <SelectItem key={a} value={a}>
                    {ASSIGNEE_LABEL[a]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Zrušit</Button>
          <Button onClick={save} disabled={loading}>{loading ? "…" : "Uložit"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
