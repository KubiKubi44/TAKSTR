"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

export function SiteHeader({ authEnabled = false }: { authEnabled?: boolean }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }

  if (pathname === "/login") return null;

  const renderLink = (item: { href: string; label: string }) => (
    <Link
      key={item.href}
      href={item.href}
      className={cn(
        "rounded-full px-3 py-1.5 transition-colors",
        isActive(item.href)
          ? "bg-white/10 text-foreground shadow-[inset_0_1px_0_0_oklch(1_0_0/0.16)]"
          : "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground",
      )}
    >
      {item.label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-background/55 shadow-[inset_0_1px_0_0_oklch(1_0_0/0.06)] backdrop-blur-2xl backdrop-saturate-150">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 text-sm">
        <nav className="flex items-center gap-1">{LEFT_NAV.map(renderLink)}</nav>
        <nav className="flex items-center gap-1">
          {RIGHT_NAV.map(renderLink)}
          {authEnabled && (
            <button
              type="button"
              onClick={logout}
              className="ml-1 rounded-full px-3 py-1.5 text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
            >
              Odhlásit
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
