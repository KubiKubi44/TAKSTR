"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

// Ruční spuštění generování follow-upů pro zralé leady bez odpovědi.
export function FollowupButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const res = await fetch("/api/followups/refresh", { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(d.error ?? "Nepovedlo se");
        return;
      }
      if (!d.candidates) toast.info("Žádné leady ke follow-upu.");
      else
        toast.success(
          `Follow-upy: ${d.generated} vygenerováno${d.failed ? `, ${d.failed} chyb` : ""} (z ${d.candidates})`,
        );
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button size="sm" variant="outline" disabled={busy} onClick={run}>
      {busy ? "Generuji…" : "Follow-upy"}
    </Button>
  );
}
