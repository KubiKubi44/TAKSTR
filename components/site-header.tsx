"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

// Vlevo = chod firmy (provoz), vpravo = obchod (akvizice)
const LEFT_NAV = [
  { href: "/", label: "Provoz" },
  { href: "/ukoly", label: "Úkoly" },
  { href: "/kalendar", label: "Kalendář" },
  { href: "/projekty", label: "Projekty" },
  { href: "/finance", label: "Finance" },
];
const RIGHT_NAV = [
  { href: "/obchod", label: "Obchod" },
  { href: "/poptavky", label: "Poptávky" },
  { href: "/kampane", label: "Kampaně" },
  { href: "/leady", label: "Leady" },
];
const ALL_NAV = [...LEFT_NAV, ...RIGHT_NAV];

export function SiteHeader({ authEnabled = false }: { authEnabled?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }

  if (pathname === "/login") return null;

  const activeLabel = ALL_NAV.find((i) => isActive(i.href))?.label ?? "TAK";

  const renderLink = (item: { href: string; label: string }) => (
    <Link
      key={item.href}
      href={item.href}
      className={cn(
        "rounded-full px-3 py-1.5 whitespace-nowrap transition-colors",
        isActive(item.href)
          ? "bg-foreground/10 text-foreground"
          : "text-muted-foreground hover:bg-foreground/6 hover:text-foreground",
      )}
    >
      {item.label}
    </Link>
  );

  const mobileLink = (item: { href: string; label: string }) => (
    <Link
      key={item.href}
      href={item.href}
      onClick={() => setOpen(false)}
      className={cn(
        "block rounded-xl px-3 py-2.5 text-[15px] transition-colors",
        isActive(item.href)
          ? "bg-foreground/10 font-medium text-foreground"
          : "text-muted-foreground active:bg-foreground/6",
      )}
    >
      {item.label}
    </Link>
  );

  const divider = <span className="mx-1 h-5 w-px shrink-0 bg-border" />;

  return (
    <>
      {/* ── Desktop: plovoucí dock + ovládání vpravo ── */}
      <header className="pointer-events-none sticky top-0 z-30 hidden justify-center px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] lg:flex">
        <nav className="glass-strong pointer-events-auto flex items-center gap-0.5 rounded-full p-1 text-[13px]">
          {LEFT_NAV.map(renderLink)}
          {divider}
          {RIGHT_NAV.map(renderLink)}
        </nav>
      </header>
      <div className="fixed top-[calc(env(safe-area-inset-top)+0.75rem)] right-4 z-40 hidden items-center gap-0.5 rounded-full glass-strong p-1 text-[13px] lg:flex">
        <ThemeToggle />
        {authEnabled && (
          <>
            <span className="mx-0.5 h-5 w-px shrink-0 bg-border" />
            <button
              type="button"
              onClick={logout}
              className="rounded-full px-3 py-1.5 text-muted-foreground transition-colors hover:bg-foreground/6 hover:text-foreground"
            >
              Odhlásit
            </button>
          </>
        )}
      </div>

      {/* ── Mobil / tablet: horní lišta + hamburger menu ── */}
      <header className="sticky top-0 z-40 lg:hidden">
        <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] bg-background/70 px-4 pt-[calc(env(safe-area-inset-top)+0.625rem)] pb-2.5 backdrop-blur-xl backdrop-saturate-150">
          <span className="font-heading text-[15px] font-semibold tracking-tight">{activeLabel}</span>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <button
              type="button"
              aria-label={open ? "Zavřít menu" : "Menu"}
              onClick={() => setOpen((o) => !o)}
              className="rounded-full p-2 text-muted-foreground transition-colors active:bg-foreground/10 active:text-foreground"
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {open && (
          <>
            <button
              type="button"
              aria-label="Zavřít menu"
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-30 cursor-default bg-black/20"
            />
            <div className="absolute inset-x-0 top-full z-40 px-3 pt-1.5">
              <nav className="glass-strong max-h-[80vh] overflow-y-auto rounded-2xl p-2">
              <p className="px-3 pt-1 pb-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">
                Provoz
              </p>
              {LEFT_NAV.map(mobileLink)}
              <p className="px-3 pt-3 pb-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">
                Obchod
              </p>
              {RIGHT_NAV.map(mobileLink)}
              {authEnabled && (
                <>
                  <span className="my-2 block h-px bg-border" />
                  <button
                    type="button"
                    onClick={logout}
                    className="block w-full rounded-xl px-3 py-2.5 text-left text-[15px] text-muted-foreground active:bg-foreground/6"
                  >
                    Odhlásit
                  </button>
                </>
              )}
              </nav>
            </div>
          </>
        )}
      </header>
    </>
  );
}
