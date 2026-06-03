"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CreateProjectButton({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/project`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? `Chyba ${res.status}`);
        return;
      }
      toast.success(data.existed ? "Projekt už existoval" : "Projekt založen");
      router.push(`/projekty/${data.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button size="sm" variant="outline" disabled={loading} onClick={run}>
      {loading ? "…" : "Založit projekt"}
    </Button>
  );
}
