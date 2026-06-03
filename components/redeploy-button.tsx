"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function RedeployButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function run() {
    if (!window.confirm("Spustit nový produkční deploy projektu?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/redeploy`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? `Chyba ${res.status}`);
        return;
      }
      toast.success("Deploy spuštěn");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button size="sm" variant="outline" disabled={loading} onClick={run}>
      {loading ? "…" : "Redeploy"}
    </Button>
  );
}
