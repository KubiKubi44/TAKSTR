"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const MONTHS = [
  "Leden",
  "Únor",
  "Březen",
  "Duben",
  "Květen",
  "Červen",
  "Červenec",
  "Srpen",
  "Září",
  "Říjen",
  "Listopad",
  "Prosinec",
];

export interface CalEvent {
  id: string;
  kind: "meeting" | "followup";
  title: string;
  startAt: string | Date;
  endAt: string | Date | null;
  location: string | null;
  note: string | null;
  done: boolean;
  leadId: string | null;
  lead: { id: string; businessName: string } | null;
}

const WEEKDAYS = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
function fmtTime(d: Date) {
  return d.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" });
}
function fmtDate(d: Date) {
  return d.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric" });
}

export function CalendarView({ events }: { events: CalEvent[] }) {
  const router = useRouter();
  const [view, setView] = useState("month");
  const today = startOfDay(new Date());
  const [cursor, setCursor] = useState({ y: today.getFullYear(), m: today.getMonth() });

  const parsed = useMemo(
    () => events.map((e) => ({ ...e, start: new Date(e.startAt) })),
    [events],
  );

  const byDay = useMemo(() => {
    const map = new Map<string, typeof parsed>();
    for (const e of parsed) {
      const k = dayKey(e.start);
      const arr = map.get(k) ?? [];
      arr.push(e);
      map.set(k, arr);
    }
    return map;
  }, [parsed]);

  const cells = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    const startWeekday = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
    const out: (Date | null)[] = [];
    for (let i = 0; i < startWeekday; i++) out.push(null);
    for (let d = 1; d <= daysInMonth; d++) out.push(new Date(cursor.y, cursor.m, d));
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [cursor]);

  const years = Array.from({ length: 9 }, (_, i) => today.getFullYear() - 3 + i);

  function shift(delta: number) {
    setCursor(({ y, m }) => {
      const d = new Date(y, m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }

  async function toggleDone(id: string) {
    await fetch(`/api/calendar/${id}/done`, { method: "POST" });
    router.refresh();
  }
  async function remove(id: string) {
    if (!window.confirm("Smazat událost?")) return;
    const res = await fetch(`/api/calendar/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Smazáno");
      router.refresh();
    } else toast.error("Smazání selhalo");
  }

  const upcoming = parsed
    .filter((e) => e.start >= today)
    .sort((a, b) => a.start.getTime() - b.start.getTime());
  const past = parsed
    .filter((e) => e.start < today)
    .sort((a, b) => b.start.getTime() - a.start.getTime());

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs value={view} onValueChange={(v) => setView(v ?? "month")}>
          <TabsList>
            <TabsTrigger value="month">Měsíc</TabsTrigger>
            <TabsTrigger value="list">Seznam</TabsTrigger>
          </TabsList>
        </Tabs>
        {view === "month" && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => shift(-1)}>
              ←
            </Button>
            <Select
              value={String(cursor.m)}
              onValueChange={(v) => setCursor((c) => ({ ...c, m: Number(v) }))}
            >
              <SelectTrigger size="sm" className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((name, i) => (
                  <SelectItem key={i} value={String(i)}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={String(cursor.y)}
              onValueChange={(v) => setCursor((c) => ({ ...c, y: Number(v) }))}
            >
              <SelectTrigger size="sm" className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={() => shift(1)}>
              →
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setCursor({ y: today.getFullYear(), m: today.getMonth() })}
            >
              Dnes
            </Button>
          </div>
        )}
      </div>

      {view === "month" ? (
        <div className="glass overflow-hidden rounded-2xl">
          <div className="grid grid-cols-7 border-b border-white/10">
            {WEEKDAYS.map((w) => (
              <div
                key={w}
                className="p-2 text-center font-mono text-xs uppercase tracking-wider text-muted-foreground"
              >
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((cell, i) => {
              const evs = cell ? byDay.get(dayKey(cell)) ?? [] : [];
              const isToday = cell && dayKey(cell) === dayKey(today);
              return (
                <div
                  key={i}
                  className={cn(
                    "min-h-24 border-t border-r border-white/5 p-1.5 nth-[7n]:border-r-0",
                    !cell && "bg-black/10",
                  )}
                >
                  {cell && (
                    <>
                      <div
                        className={cn(
                          "mb-1 inline-flex h-5 w-5 items-center justify-center rounded-full font-mono text-xs",
                          isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                        )}
                      >
                        {cell.getDate()}
                      </div>
                      <div className="space-y-1">
                        {evs.map((e) => (
                          <EventChip key={e.id} e={e} />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <ListSection
            title="Nadcházející"
            events={upcoming}
            onDone={toggleDone}
            onRemove={remove}
          />
          {past.length > 0 && (
            <ListSection title="Proběhlé" events={past} onDone={toggleDone} onRemove={remove} muted />
          )}
        </div>
      )}
    </div>
  );
}

function EventChip({ e }: { e: CalEvent & { start: Date } }) {
  const content = (
    <span
      className={cn(
        "block truncate rounded px-1 py-0.5 text-[11px] leading-tight",
        e.kind === "meeting"
          ? "bg-primary/15 text-primary"
          : "bg-white/8 text-muted-foreground",
        e.done && "line-through opacity-50",
      )}
      title={e.title}
    >
      {fmtTime(e.start)} {e.title}
    </span>
  );
  return e.leadId ? <Link href={`/leady/${e.leadId}`}>{content}</Link> : content;
}

function ListSection({
  title,
  events,
  onDone,
  onRemove,
  muted = false,
}: {
  title: string;
  events: (CalEvent & { start: Date })[];
  onDone: (id: string) => void;
  onRemove: (id: string) => void;
  muted?: boolean;
}) {
  if (events.length === 0) {
    return (
      <div>
        <h2 className="mb-2 font-heading text-sm font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">Žádné události.</p>
      </div>
    );
  }
  return (
    <div className={cn(muted && "opacity-70")}>
      <h2 className="mb-2 font-heading text-sm font-semibold">{title}</h2>
      <div className="glass divide-y divide-white/8 overflow-hidden rounded-2xl">
        {events.map((e) => (
          <div key={e.id} className="flex items-center gap-3 p-3">
            <div className="w-28 shrink-0 font-mono text-xs text-muted-foreground">
              {fmtDate(e.start)}
              <br />
              {fmtTime(e.start)}
            </div>
            <span
              className={cn(
                "shrink-0 border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider",
                e.kind === "meeting" ? "border-primary/40 text-primary" : "border-border text-muted-foreground",
              )}
            >
              {e.kind === "meeting" ? "schůzka" : "follow-up"}
            </span>
            <div className="min-w-0 flex-1">
              <p className={cn("truncate font-medium", e.done && "line-through opacity-60")}>
                {e.title}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {e.lead && (
                  <Link href={`/leady/${e.lead.id}`} className="hover:text-primary">
                    {e.lead.businessName}
                  </Link>
                )}
                {e.lead && (e.location || e.note) && " · "}
                {e.location}
                {e.location && e.note && " · "}
                {e.note}
              </p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => onDone(e.id)}>
              {e.done ? "↺" : "✓"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => onRemove(e.id)}
            >
              ✕
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
