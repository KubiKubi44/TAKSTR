"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function QuickAddTask({
  leadId,
  projectId,
}: {
  leadId?: string;
  projectId?: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: title.trim(), leadId, projectId }),
      });
      if (!res.ok) {
        toast.error("Nepovedlo se");
        return;
      }
      toast.success("Úkol přidán");
      setTitle("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={add} className="flex gap-2">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Nový úkol…"
        className="flex-1"
      />
      <Button type="submit" size="sm" variant="outline" disabled={loading}>
        + Úkol
      </Button>
    </form>
  );
}
