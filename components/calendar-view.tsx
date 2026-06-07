"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EventDialog, type EditableEvent } from "@/components/event-dialog";
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
  "Leden", "Únor", "Březen", "Duben", "Květen", "Červen",
  "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec",
];
const WEEKDAYS = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];
const START_HOUR = 7;
const END_HOUR = 22;
const HOUR_H = 44; // px na hodinu v týdenním zobrazení

export interface CalEvent {
  id: string;
  kind: "meeting" | "followup";
  title: string;
  startAt: string | Date;
  endAt: string | Date | null;
  allDay: boolean;
  location: string | null;
  note: string | null;
  done: boolean;
  leadId: string | null;
  lead: { id: string; businessName: string } | null;
  projectId: string | null;
  project: { id: string; name: string | null; vercelProjectId: string | null } | null;
}

type Cat = "meeting" | "invoice" | "followup";
function categorize(e: CalEvent): Cat {
  if (e.kind === "meeting") return "meeting";
  if (e.projectId) return "invoice";
  return "followup";
}
const CAT = {
  meeting: { label: "Schůzka", chip: "bg-info/15 text-info border-info/35", dot: "bg-info" },
  invoice: { label: "Faktura", chip: "bg-gold/15 text-gold border-gold/35", dot: "bg-gold" },
  followup: { label: "Follow-up", chip: "bg-iris/15 text-iris border-iris/35", dot: "bg-iris" },
} as const;

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
function mondayOf(d: Date) {
  const s = startOfDay(d);
  s.setDate(s.getDate() - ((s.getDay() + 6) % 7));
  return s;
}
function fmtTime(d: Date) {
  return d.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" });
}
function fmtDate(d: Date) {
  return d.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric" });
}

function toEditable(e: CalEvent & { start: Date; end: Date | null }): EditableEvent {
  return {
    id: e.id,
    kind: e.kind,
    title: e.title,
    startAt: e.start,
    endAt: e.end,
    allDay: e.allDay,
    location: e.location,
    note: e.note,
    leadId: e.leadId,
    done: e.done,
  };
}

export function CalendarView({
  events,
  leads,
}: {
  events: CalEvent[];
  leads: { id: string; businessName: string }[];
}) {
  const router = useRouter();
  const [view, setView] = useState("month");
  const today = startOfDay(new Date());
  const [cursor, setCursor] = useState(() => ({
    y: today.getFullYear(),
    m: today.getMonth(),
    d: today.getDate(),
  }));
  const cursorDate = new Date(cursor.y, cursor.m, cursor.d);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<EditableEvent | null>(null);
  const [presetStart, setPresetStart] = useState<Date | null>(null);

  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const i = setInterval(tick, 60000);
    return () => clearInterval(i);
  }, []);

  const parsed = useMemo(
    () =>
      events.map((e) => ({
        ...e,
        start: new Date(e.startAt),
        end: e.endAt ? new Date(e.endAt) : null,
      })),
    [events],
  );
  type PEvent = (typeof parsed)[number];

  const byDay = useMemo(() => {
    const map = new Map<string, PEvent[]>();
    for (const e of parsed) {
      const k = dayKey(e.start);
      const arr = map.get(k) ?? [];
      arr.push(e);
      map.set(k, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.start.getTime() - b.start.getTime());
    return map;
  }, [parsed]);

  function openCreate(date: Date) {
    setEditEvent(null);
    setPresetStart(date);
    setDialogOpen(true);
  }
  function openEdit(e: PEvent) {
    setPresetStart(null);
    setEditEvent(toEditable(e));
    setDialogOpen(true);
  }

  function shift(delta: number) {
    setCursor((c) => {
      const base = new Date(c.y, c.m, c.d);
      if (view === "week") base.setDate(base.getDate() + delta * 7);
      else base.setMonth(base.getMonth() + delta);
      return { y: base.getFullYear(), m: base.getMonth(), d: base.getDate() };
    });
  }
  function goToday() {
    setCursor({ y: today.getFullYear(), m: today.getMonth(), d: today.getDate() });
  }

  async function quickDone(id: string) {
    await fetch(`/api/calendar/${id}/done`, { method: "POST" });
    router.refresh();
  }

  // ── label v hlavičce
  const weekStart = mondayOf(cursorDate);
  const headerLabel =
    view === "week"
      ? `${weekStart.getDate()}.–${new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6).getDate()}. ${MONTHS[weekStart.getMonth()].toLowerCase()} ${weekStart.getFullYear()}`
      : `${MONTHS[cursor.m]} ${cursor.y}`;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs value={view} onValueChange={(v) => setView(v ?? "month")}>
          <TabsList>
            <TabsTrigger value="month">Měsíc</TabsTrigger>
            <TabsTrigger value="week">Týden</TabsTrigger>
            <TabsTrigger value="list">Seznam</TabsTrigger>
          </TabsList>
        </Tabs>

        {view !== "list" && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => shift(-1)}>←</Button>
            {view === "month" ? (
              <>
                <Select value={String(cursor.m)} onValueChange={(v) => setCursor((c) => ({ ...c, m: Number(v) }))}>
                  <SelectTrigger size="sm" className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((n, i) => <SelectItem key={i} value={String(i)}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={String(cursor.y)} onValueChange={(v) => setCursor((c) => ({ ...c, y: Number(v) }))}>
                  <SelectTrigger size="sm" className="w-24"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 9 }, (_, i) => today.getFullYear() - 3 + i).map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            ) : (
              <span className="min-w-52 text-center font-heading text-sm font-semibold capitalize">{headerLabel}</span>
            )}
            <Button size="sm" variant="outline" onClick={() => shift(1)}>→</Button>
            <Button size="sm" variant="ghost" onClick={goToday}>Dnes</Button>
          </div>
        )}

        {/* legenda */}
        <div className="ml-auto flex items-center gap-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {(["meeting", "followup", "invoice"] as Cat[]).map((c) => (
            <span key={c} className="flex items-center gap-1">
              <span className={cn("size-2 rounded-full", CAT[c].dot)} />
              {CAT[c].label}
            </span>
          ))}
        </div>
      </div>

      {view === "month" && (
        <MonthGrid cursor={cursor} today={today} byDay={byDay} onEvent={openEdit} onCreate={openCreate} />
      )}
      {view === "week" && (
        <WeekGrid weekStart={weekStart} today={today} now={now} byDay={byDay} onEvent={openEdit} onCreate={openCreate} />
      )}
      {view === "list" && <ListView parsed={parsed} today={today} onEvent={openEdit} onDone={quickDone} />}

      <EventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        event={editEvent}
        presetStart={presetStart}
        leads={leads}
      />
    </div>
  );
}

type GridEvent = CalEvent & { start: Date; end: Date | null };

function EventChip({ e, onEvent }: { e: GridEvent; onEvent: (e: GridEvent) => void }) {
  const c = CAT[categorize(e)];
  return (
    <button
      onClick={(ev) => {
        ev.stopPropagation();
        onEvent(e);
      }}
      className={cn(
        "block w-full truncate rounded border px-1 py-0.5 text-left text-[11px] leading-tight",
        c.chip,
        e.done && "line-through opacity-50",
      )}
      title={e.title}
    >
      {!e.allDay && `${fmtTime(e.start)} `}
      {e.title}
    </button>
  );
}

function MonthGrid({
  cursor,
  today,
  byDay,
  onEvent,
  onCreate,
}: {
  cursor: { y: number; m: number };
  today: Date;
  byDay: Map<string, GridEvent[]>;
  onEvent: (e: GridEvent) => void;
  onCreate: (d: Date) => void;
}) {
  const first = new Date(cursor.y, cursor.m, 1);
  const startWeekday = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(cursor.y, cursor.m, d));
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="glass overflow-hidden rounded-2xl">
      <div className="grid grid-cols-7 border-b border-white/10">
        {WEEKDAYS.map((w) => (
          <div key={w} className="p-2 text-center font-mono text-xs uppercase tracking-wider text-muted-foreground">{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((cell, i) => {
          const evs = cell ? byDay.get(dayKey(cell)) ?? [] : [];
          const isToday = cell && dayKey(cell) === dayKey(today);
          return (
            <div
              key={i}
              onClick={() => cell && onCreate(new Date(cell.getFullYear(), cell.getMonth(), cell.getDate(), 9))}
              className={cn(
                "min-h-24 border-t border-r border-white/5 p-1.5 nth-[7n]:border-r-0",
                cell ? "cursor-pointer hover:bg-white/5" : "bg-black/10",
              )}
            >
              {cell && (
                <>
                  <div className={cn(
                    "mb-1 inline-flex h-5 w-5 items-center justify-center rounded-full font-mono text-xs",
                    isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                  )}>
                    {cell.getDate()}
                  </div>
                  <div className="space-y-1">
                    {evs.slice(0, 4).map((e) => <EventChip key={e.id} e={e} onEvent={onEvent} />)}
                    {evs.length > 4 && <p className="px-1 text-[10px] text-muted-foreground">+{evs.length - 4} dalších</p>}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekGrid({
  weekStart,
  today,
  now,
  byDay,
  onEvent,
  onCreate,
}: {
  weekStart: Date;
  today: Date;
  now: Date | null;
  byDay: Map<string, GridEvent[]>;
  onEvent: (e: GridEvent) => void;
  onCreate: (d: Date) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i));
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
  const totalH = (END_HOUR - START_HOUR) * HOUR_H;

  const topFor = (d: Date) => (d.getHours() + d.getMinutes() / 60 - START_HOUR) * HOUR_H;

  return (
    <div className="glass overflow-hidden rounded-2xl">
      {/* hlavička dnů */}
      <div className="grid border-b border-white/10" style={{ gridTemplateColumns: "3rem repeat(7, 1fr)" }}>
        <div />
        {days.map((d) => {
          const isToday = dayKey(d) === dayKey(today);
          return (
            <div key={d.toISOString()} className="border-l border-white/5 p-2 text-center">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{WEEKDAYS[(d.getDay() + 6) % 7]}</span>
              <div className={cn("mx-auto mt-0.5 flex h-6 w-6 items-center justify-center rounded-full font-mono text-xs", isToday ? "bg-primary text-primary-foreground" : "")}>
                {d.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* celý den řádek */}
      <div className="grid border-b border-white/10" style={{ gridTemplateColumns: "3rem repeat(7, 1fr)" }}>
        <div className="p-1 text-right font-mono text-[9px] uppercase text-muted-foreground">celý den</div>
        {days.map((d) => {
          const allDay = (byDay.get(dayKey(d)) ?? []).filter((e) => e.allDay);
          return (
            <div key={d.toISOString()} className="min-h-7 space-y-1 border-l border-white/5 p-1">
              {allDay.map((e) => <EventChip key={e.id} e={e} onEvent={onEvent} />)}
            </div>
          );
        })}
      </div>

      {/* hodinová mřížka */}
      <div className="grid max-h-[70vh] overflow-y-auto" style={{ gridTemplateColumns: "3rem repeat(7, 1fr)" }}>
        {/* časová osa */}
        <div className="relative" style={{ height: totalH }}>
          {hours.map((h) => (
            <div key={h} className="absolute right-1 -translate-y-1/2 font-mono text-[10px] text-muted-foreground" style={{ top: (h - START_HOUR) * HOUR_H }}>
              {h}:00
            </div>
          ))}
        </div>
        {days.map((d) => {
          const timed = (byDay.get(dayKey(d)) ?? []).filter((e) => !e.allDay);
          const isToday = dayKey(d) === dayKey(today);
          const nowTop = now && now.getHours() + now.getMinutes() / 60 >= START_HOUR && now.getHours() < END_HOUR
            ? (now.getHours() + now.getMinutes() / 60 - START_HOUR) * HOUR_H
            : null;
          return (
            <div key={d.toISOString()} className="relative border-l border-white/5" style={{ height: totalH }}>
              {hours.map((h) => (
                <div
                  key={h}
                  onClick={() => onCreate(new Date(d.getFullYear(), d.getMonth(), d.getDate(), h))}
                  className="cursor-pointer border-t border-white/5 hover:bg-white/5"
                  style={{ height: HOUR_H }}
                />
              ))}
              {timed.map((e) => {
                const top = Math.max(0, topFor(e.start));
                const dur = e.end ? (e.end.getTime() - e.start.getTime()) / 3600000 : 1;
                const height = Math.max(20, Math.min(dur, END_HOUR - START_HOUR) * HOUR_H - 2);
                const c = CAT[categorize(e)];
                return (
                  <button
                    key={e.id}
                    onClick={(ev) => { ev.stopPropagation(); onEvent(e); }}
                    className={cn("absolute left-0.5 right-0.5 overflow-hidden rounded border px-1 py-0.5 text-left text-[11px] leading-tight", c.chip, e.done && "line-through opacity-50")}
                    style={{ top, height }}
                    title={e.title}
                  >
                    <span className="font-mono">{fmtTime(e.start)}</span> {e.title}
                  </button>
                );
              })}
              {isToday && nowTop !== null && (
                <div className="pointer-events-none absolute inset-x-0 z-10 border-t border-destructive" style={{ top: nowTop }}>
                  <span className="absolute left-0 -top-1 size-2 rounded-full bg-destructive" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ListView({
  parsed,
  today,
  onEvent,
  onDone,
}: {
  parsed: GridEvent[];
  today: Date;
  onEvent: (e: GridEvent) => void;
  onDone: (id: string) => void;
}) {
  const upcoming = parsed.filter((e) => e.start >= today).sort((a, b) => a.start.getTime() - b.start.getTime());
  const past = parsed.filter((e) => e.start < today).sort((a, b) => b.start.getTime() - a.start.getTime());
  return (
    <div className="space-y-6">
      <Section title="Nadcházející" events={upcoming} onEvent={onEvent} onDone={onDone} />
      {past.length > 0 && <Section title="Proběhlé" events={past} onEvent={onEvent} onDone={onDone} muted />}
    </div>
  );
}

function Section({
  title,
  events,
  onEvent,
  onDone,
  muted = false,
}: {
  title: string;
  events: GridEvent[];
  onEvent: (e: GridEvent) => void;
  onDone: (id: string) => void;
  muted?: boolean;
}) {
  if (events.length === 0)
    return (
      <div>
        <h2 className="mb-2 font-heading text-sm font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">Žádné události.</p>
      </div>
    );
  return (
    <div className={cn(muted && "opacity-70")}>
      <h2 className="mb-2 font-heading text-sm font-semibold">{title}</h2>
      <div className="glass divide-y divide-white/8 overflow-hidden rounded-2xl">
        {events.map((e) => {
          const c = CAT[categorize(e)];
          return (
            <div key={e.id} className="flex items-center gap-3 p-3">
              <div className="w-28 shrink-0 font-mono text-xs text-muted-foreground">
                {fmtDate(e.start)}
                <br />
                {!e.allDay && fmtTime(e.start)}
              </div>
              <span className={cn("shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider", c.chip)}>{c.label}</span>
              <button onClick={() => onEvent(e)} className="min-w-0 flex-1 text-left">
                <p className={cn("truncate font-medium", e.done && "line-through opacity-60")}>{e.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {e.lead && <Link href={`/leady/${e.lead.id}`} className="hover:text-primary">{e.lead.businessName}</Link>}
                  {e.project && <Link href={`/projekty/${e.project.vercelProjectId ?? e.project.id}`} className="hover:text-primary">{e.project.name ?? "projekt"}</Link>}
                  {(e.lead || e.project) && (e.location || e.note) && " · "}
                  {e.location}
                  {e.location && e.note && " · "}
                  {e.note}
                </p>
              </button>
              <Button size="sm" variant="ghost" onClick={() => onDone(e.id)}>{e.done ? "↺" : "✓"}</Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
