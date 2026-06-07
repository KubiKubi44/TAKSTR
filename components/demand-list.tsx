"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export interface DemandRow {
  id: string;
  source: string;
  title: string;
  url: string;
  category: string | null;
  status: string;
  createdAt: string | Date;
}

const SOURCE_LABEL: Record<string, string> = {
  poptavej: "Poptávej",
  epoptavka: "ePoptávka",
};

const STATUS_LABEL: Record<string, string> = {
  new: "nová",
  seen: "viděno",
  contacted: "kontaktováno",
  dismissed: "skryto",
};

function fmt(d: string | Date): string {
  return new Date(d).toLocaleDateString("cs-CZ", { day: "2-digit", month: "2-digit" });
}

export function DemandList({ items }: { items: DemandRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setBusy(true);
    try {
      const res = await fetch("/api/demand/refresh", { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) toast.error(d.error ?? "Nepovedlo se");
      else
        toast.success(
          d.added > 0 ? `Nových poptávek: ${d.added}` : `Žádné nové (zkontrolováno ${d.found ?? 0})`,
        );
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(id: string, status: string) {
    const res = await fetch(`/api/demand/${id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) router.refresh();
    else toast.error("Nepovedlo se");
  }

  async function makeTask(it: DemandRow) {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: `Odpovědět na poptávku: ${it.title}`,
        note: it.url,
        priority: "high",
      }),
    });
    if (res.ok) {
      toast.success("Úkol založen");
      if (it.status === "new") setStatus(it.id, "seen");
    } else toast.error("Úkol se nepovedlo založit");
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Button size="sm" variant="outline" disabled={busy} onClick={refresh}>
          {busy ? "Stahuji…" : "Obnovit teď"}
        </Button>
        <span className="font-mono text-xs text-muted-foreground">{items.length} poptávek</span>
      </div>

      {items.length === 0 ? (
        <Card className="p-6 text-sm text-muted-foreground">
          Zatím žádné poptávky. Klikni na „Obnovit teď“ — stáhnu nové z Poptávej a ePoptávka.
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((it) => (
            <Card
              key={it.id}
              className="flex flex-row flex-wrap items-center gap-3 p-4"
            >
              {it.status === "new" && (
                <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400" title="nová" />
              )}
              <div className="min-w-0 flex-1">
                <a
                  href={it.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate font-medium hover:text-primary"
                >
                  {it.title}
                </a>
                <div className="mt-0.5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  <span>{SOURCE_LABEL[it.source] ?? it.source}</span>
                  {it.category && <span>· {it.category}</span>}
                  <span>· {fmt(it.createdAt)}</span>
                  {it.status !== "new" && <span>· {STATUS_LABEL[it.status] ?? it.status}</span>}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button size="sm" variant="ghost" onClick={() => makeTask(it)}>
                  + úkol
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={it.status === "contacted"}
                  onClick={() => setStatus(it.id, "contacted")}
                >
                  Kontaktováno
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground"
                  onClick={() => setStatus(it.id, "dismissed")}
                >
                  Skrýt
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
