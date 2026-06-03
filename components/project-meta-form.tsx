"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ProjectMetaForm({
  projectId,
  initial,
}: {
  projectId: string;
  initial: { buildPrice: number | null; monthlyPrice: number | null; note: string | null };
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [buildPrice, setBuildPrice] = useState(initial.buildPrice?.toString() ?? "");
  const [monthlyPrice, setMonthlyPrice] = useState(initial.monthlyPrice?.toString() ?? "");
  const [note, setNote] = useState(initial.note ?? "");

  async function save() {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/meta`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          buildPrice: buildPrice.trim() === "" ? null : buildPrice,
          monthlyPrice: monthlyPrice.trim() === "" ? null : monthlyPrice,
          note,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error ?? "Uložení selhalo");
        return;
      }
      toast.success("Uloženo");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="build">Výrobní cena (Kč)</Label>
          <Input
            id="build"
            inputMode="numeric"
            value={buildPrice}
            onChange={(e) => setBuildPrice(e.target.value)}
            placeholder="25000"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="monthly">Měsíční správa (Kč)</Label>
          <Input
            id="monthly"
            inputMode="numeric"
            value={monthlyPrice}
            onChange={(e) => setMonthlyPrice(e.target.value)}
            placeholder="1500"
          />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="note">Poznámky</Label>
        <Textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={6}
          placeholder="Cokoliv k projektu — přístupy, dohody, TODO…"
        />
      </div>
      <Button onClick={save} disabled={loading}>
        {loading ? "Ukládám…" : "Uložit"}
      </Button>
    </div>
  );
}
