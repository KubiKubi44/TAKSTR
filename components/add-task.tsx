"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PRIORITIES, PRIORITY_LABEL } from "@/lib/taskMeta";

const NONE = "none";

export function AddTask({ projects }: { projects: { id: string; name: string }[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [priority, setPriority] = useState("normal");
  const [projectId, setProjectId] = useState(NONE);
  const [loading, setLoading] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          dueAt: due || undefined,
          priority,
          projectId: projectId !== NONE ? projectId : undefined,
        }),
      });
      if (!res.ok) {
        toast.error("Nepovedlo se");
        return;
      }
      setTitle("");
      setDue("");
      setProjectId(NONE);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={add} className="flex flex-wrap items-center gap-2">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Nový úkol…"
        className="min-w-48 flex-1"
      />
      <Select value={priority} onValueChange={(v) => setPriority(v ?? "normal")}>
        <SelectTrigger className="w-28">
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
      {projects.length > 0 && (
        <Select value={projectId} onValueChange={(v) => setProjectId(v ?? NONE)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Projekt" />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            <SelectItem value={NONE}>Bez projektu</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Input
        type="date"
        value={due}
        onChange={(e) => setDue(e.target.value)}
        className="w-40"
        title="Termín (volitelně)"
      />
      <Button type="submit" disabled={loading}>
        {loading ? "…" : "Přidat"}
      </Button>
    </form>
  );
}
