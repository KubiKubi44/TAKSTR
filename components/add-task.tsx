"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AddTask() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [loading, setLoading] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: title.trim(), dueAt: due || undefined }),
      });
      if (!res.ok) {
        toast.error("Nepovedlo se");
        return;
      }
      setTitle("");
      setDue("");
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
