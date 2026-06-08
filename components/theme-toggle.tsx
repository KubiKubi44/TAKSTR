"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const OPTS = [
  { key: "light", icon: Sun, label: "Světlý" },
  { key: "system", icon: Monitor, label: "Systém" },
  { key: "dark", icon: Moon, label: "Tmavý" },
] as const;

// Segmentový přepínač světlý / systém / tmavý.
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="flex items-center gap-0.5">
      {OPTS.map((o) => {
        const Icon = o.icon;
        return (
          <button
            key={o.key}
            type="button"
            aria-label={o.label}
            title={o.label}
            onClick={() => setTheme(o.key)}
            className={cn(
              "rounded-full p-1.5 transition-colors",
              theme === o.key
                ? "bg-foreground/12 text-foreground"
                : "text-muted-foreground hover:bg-foreground/6 hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
          </button>
        );
      })}
    </div>
  );
}
