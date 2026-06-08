"use client";

import { useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Vlastní kalendář (base-ui Popover) — nahrazuje nativní <input type="date">.
// Hodnota je "YYYY-MM-DD" string (nebo "" = bez termínu).

const WEEKDAYS = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];

function ymd(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function parse(v: string): Date | null {
  if (!v) return null;
  const d = new Date(v + "T00:00:00");
  return Number.isNaN(d.getTime()) ? null : d;
}
function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function displayCz(d: Date): string {
  return d.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric" });
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Termín",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [today] = useState(() => new Date());
  const selected = parse(value);
  // zobrazený měsíc (nastaví se při otevření na měsíc vybraného data / dnešek)
  const [view, setView] = useState(() => {
    const base = selected ?? today;
    return { y: base.getFullYear(), m: base.getMonth() };
  });

  const first = new Date(view.y, view.m, 1);
  const offset = (first.getDay() + 6) % 7; // Po = 0
  const gridStart = new Date(view.y, view.m, 1 - offset);
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });

  function pick(d: Date) {
    onChange(ymd(d));
    setOpen(false);
  }
  function quick(daysFromNow: number) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + daysFromNow);
    pick(d);
  }

  return (
    <Popover.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          const base = parse(value) ?? today;
          setView({ y: base.getFullYear(), m: base.getMonth() });
        }
      }}
    >
      <Popover.Trigger
        className={cn(
          "flex h-8 items-center gap-2 rounded-lg border border-input bg-transparent px-2.5 text-sm transition-colors outline-none select-none hover:bg-foreground/5 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30",
          !selected && "text-muted-foreground",
          className,
        )}
      >
        <CalendarDays className="size-4 text-muted-foreground" />
        {selected ? displayCz(selected) : placeholder}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="start" sideOffset={6} className="z-50">
          <Popover.Popup className="glass-strong w-72 rounded-2xl p-3 text-sm text-popover-foreground outline-none">
            {/* rychlá volba */}
            <div className="mb-3 flex flex-wrap gap-1.5">
              {[
                { label: "Dnes", d: 0 },
                { label: "Zítra", d: 1 },
                { label: "Za týden", d: 7 },
              ].map((q) => (
                <button
                  key={q.label}
                  type="button"
                  onClick={() => quick(q.d)}
                  className="rounded-full border border-border px-2.5 py-1 font-mono text-xs text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
                >
                  {q.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
                className="rounded-full border border-border px-2.5 py-1 font-mono text-xs text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
              >
                Bez termínu
              </button>
            </div>

            {/* hlavička měsíce */}
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                aria-label="Předchozí měsíc"
                onClick={() => setView((v) => ({ y: v.m === 0 ? v.y - 1 : v.y, m: (v.m + 11) % 12 }))}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="font-heading text-sm font-semibold capitalize">
                {first.toLocaleDateString("cs-CZ", { month: "long", year: "numeric" })}
              </span>
              <button
                type="button"
                aria-label="Další měsíc"
                onClick={() => setView((v) => ({ y: v.m === 11 ? v.y + 1 : v.y, m: (v.m + 1) % 12 }))}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>

            {/* dny v týdnu */}
            <div className="mb-1 grid grid-cols-7 gap-0.5">
              {WEEKDAYS.map((w) => (
                <span key={w} className="py-1 text-center font-mono text-[10px] uppercase text-muted-foreground/60">
                  {w}
                </span>
              ))}
            </div>

            {/* mřížka dnů */}
            <div className="grid grid-cols-7 gap-0.5">
              {days.map((d, i) => {
                const inMonth = d.getMonth() === view.m;
                const isToday = sameDay(d, today);
                const isSel = selected && sameDay(d, selected);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => pick(d)}
                    className={cn(
                      "flex h-8 items-center justify-center rounded-md font-mono text-xs tabular-nums transition-colors",
                      isSel
                        ? "bg-primary font-semibold text-primary-foreground"
                        : "hover:bg-foreground/10",
                      !isSel && !inMonth && "text-muted-foreground/35",
                      !isSel && inMonth && "text-foreground",
                      !isSel && isToday && "text-info",
                    )}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
