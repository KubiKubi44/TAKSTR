"use client";

import { useState } from "react";
import { EventDialog, type EditableEvent } from "@/components/event-dialog";
import { Button } from "@/components/ui/button";
import {
  COLOR_CHIP,
  COLOR_DOT,
  EVENT_KINDS,
  EVENT_KIND_COLOR,
  EVENT_KIND_LABEL,
  eventColorToken,
} from "@/lib/eventMeta";
import { cn } from "@/lib/utils";

const MONTHS = [
  "Leden", "Únor", "Březen", "Duben", "Květen", "Červen",
  "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec",
];
const WEEKDAYS = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];

export interface CalEvent {
  id: string;
  kind: string;
  color: string | null;
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

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
function fmtTime(d: Date) {
  return d.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" });
}
function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
const evChip = (e: { kind: string; color: string | null }) =>
  COLOR_CHIP[eventColorToken(e)] ?? COLOR_CHIP.slate;
const evDot = (e: { kind: string; color: string | null }) =>
  COLOR_DOT[eventColorToken(e)] ?? COLOR_DOT.slate;
const evLabel = (e: { kind: string }) => EVENT_KIND_LABEL[e.kind] ?? e.kind;

function toEditable(e: CalEvent): EditableEvent {
  return {
    id: e.id,
    kind: e.kind,
    color: e.color,
    title: e.title,
    startAt: e.startAt,
    endAt: e.endAt,
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
  const [today] = useState(() => new Date());
  const [cursor, setCursor] = useState(() => ({ y: today.getFullYear(), m: today.getMonth() }));
  const [selected, setSelected] = useState(() => startOfDay(today));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EditableEvent | null>(null);
  const [presetStart, setPresetStart] = useState<Date | null>(null);

  // události podle dne
  const byDay = new Map<string, CalEvent[]>();
  for (const e of events) {
    const k = dayKey(new Date(e.startAt));
    const arr = byDay.get(k);
    if (arr) arr.push(e);
    else byDay.set(k, [e]);
  }
  for (const arr of byDay.values()) {
    arr.sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt));
  }
  const dayEvents = byDay.get(dayKey(selected)) ?? [];

  function openEdit(e: CalEvent) {
    setEditing(toEditable(e));
    setPresetStart(null);
    setDialogOpen(true);
  }
  function openCreate(d: Date) {
    const s = new Date(d);
    s.setHours(9, 0, 0, 0);
    setEditing(null);
    setPresetStart(s);
    setDialogOpen(true);
  }

  // mřížka měsíce (Po–Ne, 6 týdnů)
  const first = new Date(cursor.y, cursor.m, 1);
  const offset = (first.getDay() + 6) % 7;
  const gridStart = new Date(cursor.y, cursor.m, 1 - offset);
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });

  return (
    <div>
      {/* lišta měsíce */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Předchozí měsíc"
            onClick={() => setCursor((c) => ({ y: c.m === 0 ? c.y - 1 : c.y, m: (c.m + 11) % 12 }))}
          >
            ‹
          </Button>
          <span className="w-44 text-center font-heading text-base font-semibold">
            {MONTHS[cursor.m]} {cursor.y}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Další měsíc"
            onClick={() => setCursor((c) => ({ y: c.m === 11 ? c.y + 1 : c.y, m: (c.m + 1) % 12 }))}
          >
            ›
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setCursor({ y: today.getFullYear(), m: today.getMonth() });
            setSelected(startOfDay(today));
          }}
        >
          Dnes
        </Button>
        <div className="ml-auto flex flex-wrap gap-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {EVENT_KINDS.map((k) => (
            <span key={k} className="flex items-center gap-1">
              <span className={cn("size-2 rounded-full", COLOR_DOT[EVENT_KIND_COLOR[k]])} />
              {EVENT_KIND_LABEL[k]}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        {/* měsíční mřížka */}
        <div className="glass rounded-2xl p-2">
          <div className="grid grid-cols-7">
            {WEEKDAYS.map((w) => (
              <div
                key={w}
                className="py-2 text-center font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
              >
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((d, i) => {
              const evs = byDay.get(dayKey(d)) ?? [];
              const inMonth = d.getMonth() === cursor.m;
              const isToday = dayKey(d) === dayKey(today);
              const isSel = dayKey(d) === dayKey(selected);
              return (
                <div
                  key={i}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelected(startOfDay(d))}
                  onDoubleClick={() => openCreate(d)}
                  className={cn(
                    "flex min-h-22 cursor-pointer flex-col gap-1 rounded-lg border p-1.5 transition-colors",
                    isSel ? "border-foreground/40 bg-foreground/5" : "border-transparent hover:bg-foreground/5",
                    !inMonth && "opacity-40",
                  )}
                >
                  <span
                    className={cn(
                      "font-mono text-xs tabular-nums",
                      isToday
                        ? "flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    {d.getDate()}
                  </span>
                  <div className="space-y-0.5">
                    {evs.slice(0, 3).map((e) => (
                      <button
                        key={e.id}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          openEdit(e);
                        }}
                        className={cn(
                          "block w-full truncate rounded border px-1 text-left text-[10px] leading-tight",
                          evChip(e),
                          e.done && "line-through opacity-50",
                        )}
                      >
                        {!e.allDay && `${fmtTime(new Date(e.startAt))} `}
                        {e.title}
                      </button>
                    ))}
                    {evs.length > 3 && (
                      <span className="block px-1 text-[10px] text-muted-foreground">
                        +{evs.length - 3} dalších
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* panel vybraného dne */}
        <div className="glass h-fit rounded-2xl p-4">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {cap(selected.toLocaleDateString("cs-CZ", { weekday: "long" }))}
              </p>
              <h2 className="font-heading text-lg font-semibold tracking-tight">
                {selected.toLocaleDateString("cs-CZ", { day: "numeric", month: "long" })}
              </h2>
            </div>
            <Button size="sm" onClick={() => openCreate(selected)}>
              + Přidat
            </Button>
          </div>

          {dayEvents.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Žádné události.
            </p>
          ) : (
            <div className="space-y-2">
              {dayEvents.map((e) => (
                <button
                  key={e.id}
                  onClick={() => openEdit(e)}
                  className="glass glass-hover block w-full rounded-xl p-3 text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className={cn("size-2 shrink-0 rounded-full", evDot(e))} />
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">
                      {e.allDay ? "celý den" : fmtTime(new Date(e.startAt))}
                    </span>
                    <span
                      className={cn(
                        "ml-auto rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider",
                        evChip(e),
                      )}
                    >
                      {evLabel(e)}
                    </span>
                  </div>
                  <p className={cn("mt-1.5 font-medium leading-snug", e.done && "line-through opacity-60")}>
                    {e.title}
                  </p>
                  {(e.location || e.lead || e.project) && (
                    <div className="mt-1 flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                      {e.location && <span>{e.location}</span>}
                      {e.lead && <span>· {e.lead.businessName}</span>}
                      {e.project && <span>· {e.project.name ?? "projekt"}</span>}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <EventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        event={editing}
        presetStart={presetStart}
        leads={leads}
      />
    </div>
  );
}
