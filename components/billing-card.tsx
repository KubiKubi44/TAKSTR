"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { isPast } from "@/lib/time";

function fmt(d: Date) {
  return d.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric" });
}

export function BillingCard({
  projectId,
  projectName,
  nextInvoiceAt,
}: {
  projectId: string;
  projectName: string;
  nextInvoiceAt: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(nextInvoiceAt ? nextInvoiceAt.slice(0, 10) : "");

  const next = nextInvoiceAt ? new Date(nextInvoiceAt) : null;
  const due = isPast(nextInvoiceAt);

  async function call(payload: Record<string, unknown>, msg: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/billing`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectName, ...payload }),
      });
      if (!res.ok) {
        toast.error("Nepovedlo se");
        return;
      }
      toast.success(msg);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="gap-3 p-5">
      <h2 className="font-heading text-sm font-semibold">Fakturace</h2>

      <div className="border border-border p-3">
        {!next ? (
          <p className="text-sm text-muted-foreground">Není nastaveno datum faktury.</p>
        ) : due ? (
          <p className="text-sm">
            <span className="font-mono uppercase tracking-wider text-destructive">K fakturaci</span>{" "}
            — termín byl {fmt(next)}
          </p>
        ) : (
          <p className="text-sm">
            <span className="font-mono uppercase tracking-wider text-primary">Zaplaceno</span> do{" "}
            {fmt(next)}
          </p>
        )}
      </div>

      <div className="flex items-end gap-2">
        <div className="grid flex-1 gap-1.5">
          <label htmlFor="inv" className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Datum příští faktury
          </label>
          <Input id="inv" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <Button size="sm" variant="outline" disabled={loading} onClick={() => call({ nextInvoiceAt: date || null }, date ? "Uloženo" : "Zrušeno")}>
          Uložit
        </Button>
      </div>

      <Button size="sm" disabled={loading} onClick={() => call({ action: "paid" }, "Vyfakturováno, posunuto o měsíc")}>
        Vyfakturováno → posunout o měsíc
      </Button>
    </Card>
  );
}
