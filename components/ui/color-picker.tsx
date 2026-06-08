"use client";

import { COLOR_DOT, COLOR_LABEL, EVENT_COLORS } from "@/lib/eventMeta";
import { cn } from "@/lib/utils";

// Výběr vlastní barvy události. "" = dle typu (auto).
export function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => onChange("")}
        title="Dle typu"
        className={cn(
          "flex size-6 items-center justify-center rounded-full border border-border font-mono text-[10px] text-muted-foreground transition",
          !value && "ring-2 ring-foreground ring-offset-2 ring-offset-background",
        )}
      >
        A
      </button>
      {EVENT_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          title={COLOR_LABEL[c]}
          className={cn(
            "size-6 rounded-full transition",
            COLOR_DOT[c],
            value === c && "ring-2 ring-foreground ring-offset-2 ring-offset-background",
          )}
        />
      ))}
    </div>
  );
}
