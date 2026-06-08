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
        "rounded-full px-3 py-1.5 whitespace-nowrap transition-colors",
        isActive(item.href)
          ? "bg-white/10 text-foreground shadow-[inset_0_1px_0_0_oklch(1_0_0/0.18)]"
          : "text-muted-foreground hover:bg-white/6 hover:text-foreground",
      )}
    >
      {item.label}
    </Link>
  );

  const divider = <span className="mx-1 h-5 w-px shrink-0 bg-white/10" />;

  return (
    // plovoucí dock — centrovaný skleněný pill kousek od horního okraje
    <header className="pointer-events-none sticky top-0 z-30 flex justify-center px-4 pt-3">
      <nav className="glass-strong pointer-events-auto flex items-center gap-0.5 rounded-full p-1 text-[13px]">
        {LEFT_NAV.map(renderLink)}
        {divider}
        {RIGHT_NAV.map(renderLink)}
        {authEnabled && (
          <>
            {divider}
            <button
              type="button"
              onClick={logout}
              className="rounded-full px-3 py-1.5 text-muted-foreground transition-colors hover:bg-white/6 hover:text-foreground"
            >
              Odhlásit
            </button>
          </>
        )}
      </nav>
    </header>
  );
}
