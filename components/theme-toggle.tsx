"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

// Přepínač světlý/tmavý. Ikona se vybírá CSS variantou (dark:) podle třídy
// na <html> — žádný mounted-state (nevadí hydrataci ani lint pravidlu).
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <button
      type="button"
      aria-label="Přepnout světlý/tmavý režim"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-foreground/6 hover:text-foreground"
    >
      <Sun className="hidden size-4 dark:block" />
      <Moon className="block size-4 dark:hidden" />
    </button>
  );
}
