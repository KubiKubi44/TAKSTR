"use client";

import { useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const OPTS = [
  { key: "light", icon: Sun, label: "Světlý" },
  { key: "system", icon: Monitor, label: "Systém" },
  { key: "dark", icon: Moon, label: "Tmavý" },
] as const;

// Přepínač režimu za proklik. Ikona triggeru se vybírá CSS (dark: variantou)
// podle třídy na <html> — žádné čtení theme při renderu, takže nevzniká
// hydration mismatch. Menu (theme-závislé) se vykreslí až po otevření.
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        aria-label="Režim vzhledu"
        title="Režim vzhledu"
        className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-foreground/6 hover:text-foreground"
      >
        <Sun className="block size-4 dark:hidden" />
        <Moon className="hidden size-4 dark:block" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="end" sideOffset={8} className="z-50">
          <Popover.Popup className="glass-strong w-40 rounded-xl p-1 text-sm outline-none">
            {OPTS.map((o) => {
              const Icon = o.icon;
              return (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => {
                    setTheme(o.key);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors",
                    theme === o.key
                      ? "bg-foreground/10 text-foreground"
                      : "text-muted-foreground hover:bg-foreground/6 hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  {o.label}
                </button>
              );
            })}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
