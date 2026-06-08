"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface DemandRow {
  id: string;
  source: string;
  title: string;
  url: string;
  category: string | null;
  status: string;
  postedAt: string | null;
  createdAt: string | Date;
}

// datum poptávky, jinak kdy jsme ji poprvé viděli
function effectiveDate(it: DemandRow): Date {
  return new Date(it.postedAt ?? it.createdAt);
}

const SOURCE_META: Record<string, { label: string; chip: string }> = {
  epoptavka: { label: "ePoptávka", chip: "text-info border-info/40" },
  poptavej: { label: "Poptávej", chip: "text-iris border-iris/40" },
  freelance: { label: "Freelance", chip: "text-gold border-gold/40" },
};
const sourceLabel = (s: string) => SOURCE_META[s]?.label ?? s;

function fmt(d: string | Date): string {
  return new Date(d).toLocaleDateString("cs-CZ", { day: "2-digit", month: "2-digit" });
}

const RANGE_DAYS: Record<string, number> = { "1": 1, "7": 7, "30": 30 };

interface RowActions {
  onTask: (it: DemandRow) => void;
  onStatus: (id: string, status: string) => void;
}

function DemandRowCard({ it, onTask, onStatus }: { it: DemandRow } & RowActions) {
  return (
    <Card className="glass-hover flex flex-row flex-wrap items-center gap-3 px-4 py-3">
      <span
        className={cn(
          "w-20 shrink-0 border px-1.5 py-0.5 text-center font-mono text-[10px] uppercase tracking-wider",
          SOURCE_META[it.source]?.chip ?? "text-muted-foreground border-border",
        )}
      >
        {sourceLabel(it.source)}
      </span>
      <div className="min-w-0 flex-1">
        <a
          href={it.url}
          target="_blank"
          rel="noreferrer"
          className="block truncate font-medium hover:text-primary"
        >
          {it.title}
        </a>
        {it.category && (
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {it.category}
          </span>
        )}
      </div>
      {it.status === "contacted" && (
        <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-success">
          kontaktováno
        </span>
      )}
      <span className="w-12 shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground">
        {fmt(effectiveDate(it))}
      </span>
      <div className="flex shrink-0 items-center gap-1">
        <Button size="sm" variant="ghost" onClick={() => onTask(it)}>
          + úkol
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={it.status === "contacted"}
          onClick={() => onStatus(it.id, "contacted")}
        >
          Kontaktováno
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-muted-foreground"
          onClick={() => onStatus(it.id, "dismissed")}
        >
          Skrýt
        </Button>
      </div>
    </Card>
  );
}

function DemandSection({
  title,
  rows,
  ...actions
}: { title: string; rows: DemandRow[] } & RowActions) {
  if (rows.length === 0) return null;
  return (
    <section className="space-y-2">
      <h2 className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        {title} ({rows.length})
      </h2>
      {rows.map((it) => (
        <DemandRowCard key={it.id} it={it} {...actions} />
      ))}
    </section>
  );
}

export function DemandList({ items }: { items: DemandRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [range, setRange] = useState("all");
  const [source, setSource] = useState("all");
  const [statusF, setStatusF] = useState("all"); // all | new | done
  // „teď" zachycené jednorázově při mountu (Date.now nesmí být v renderu)
  const [now] = useState(() => Date.now());

  // 1) filtr období
  const dated = useMemo(() => {
    if (range === "all") return items;
    const cutoff = now - (RANGE_DAYS[range] ?? 0) * 86400000;
    return items.filter((it) => effectiveDate(it).getTime() >= cutoff);
  }, [items, range, now]);

  // 2) filtr stavu (nové vs probrané)
  const statusFiltered = useMemo(() => {
    if (statusF === "new") return dated.filter((it) => it.status === "new");
    if (statusF === "done") return dated.filter((it) => it.status !== "new");
    return dated;
  }, [dated, statusF]);

  // počty pro chipy zdrojů (z aktuálně filtrovaných dle období+stavu)
  const sourceCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const it of statusFiltered) m[it.source] = (m[it.source] ?? 0) + 1;
    return m;
  }, [statusFiltered]);

  // 3) filtr zdroje
  const shown = useMemo(
    () => (source === "all" ? statusFiltered : statusFiltered.filter((it) => it.source === source)),
    [statusFiltered, source],
  );

  const newItems = shown.filter((it) => it.status === "new");
  const doneItems = shown.filter((it) => it.status !== "new");
  const newCount = dated.filter((it) => it.status === "new").length;

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

  const actions: RowActions = { onTask: makeTask, onStatus: setStatus };

  const sourceChips = [
    { key: "all", label: "Vše", count: statusFiltered.length },
    ...Object.keys(SOURCE_META)
      .filter((k) => sourceCounts[k])
      .map((k) => ({ key: k, label: sourceLabel(k), count: sourceCounts[k] })),
  ];

  return (
    <div>
      {/* shrnutí + akce */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Button size="sm" variant="outline" disabled={busy} onClick={refresh}>
          {busy ? "Stahuji…" : "Obnovit teď"}
        </Button>
        <span className="font-mono text-xs text-muted-foreground">
          <span className="text-foreground">{dated.length}</span> poptávek
          {newCount > 0 && (
            <>
              {" · "}
              <span className="text-info">{newCount} nových</span>
            </>
          )}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Select value={statusF} onValueChange={(v) => setStatusF(v ?? "all")}>
            <SelectTrigger size="sm" className="w-36">
              <SelectValue placeholder="Stav" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Vše</SelectItem>
              <SelectItem value="new">Jen nové</SelectItem>
              <SelectItem value="done">Probrané</SelectItem>
            </SelectContent>
          </Select>
          <Select value={range} onValueChange={(v) => setRange(v ?? "all")}>
            <SelectTrigger size="sm" className="w-36">
              <SelectValue placeholder="Období" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Všechna data</SelectItem>
              <SelectItem value="1">Dnes</SelectItem>
              <SelectItem value="7">7 dní</SelectItem>
              <SelectItem value="30">30 dní</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* filtr zdroje (chipy s počty) */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {sourceChips.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setSource(s.key)}
            className={cn(
              "rounded-full border px-2.5 py-1 font-mono text-xs transition-colors",
              source === s.key
                ? "border-transparent bg-foreground/10 text-foreground"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {s.label} <span className="tabular-nums opacity-60">{s.count}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <Card className="p-6 text-sm text-muted-foreground">
          {items.length === 0
            ? "Zatím žádné poptávky. Klikni na „Obnovit teď“ — stáhnu nové z ePoptávka, Poptávej a Freelance.cz."
            : "Nic neodpovídá filtru. Zkus jiný zdroj / období / stav."}
        </Card>
      ) : statusF === "all" ? (
        <div className="space-y-6">
          <DemandSection title="Nové" rows={newItems} {...actions} />
          <DemandSection title="Probrané" rows={doneItems} {...actions} />
        </div>
      ) : (
        <div className="space-y-2">
          {shown.map((it) => (
            <DemandRowCard key={it.id} it={it} {...actions} />
          ))}
        </div>
      )}
    </div>
  );
}
