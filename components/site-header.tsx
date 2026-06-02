"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LEFT_NAV = [
  { href: "/kampane", label: "Kampaně" },
  { href: "/leady", label: "Leady" },
];
const RIGHT_NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/kalendar", label: "Kalendář" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const renderLink = (item: { href: string; label: string }) => (
    <Link
      key={item.href}
      href={item.href}
      className={cn(
        "-mb-px flex items-center border-b-2 transition-colors",
        isActive(item.href)
          ? "border-primary text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      {item.label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-background/40 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-14 max-w-6xl items-stretch justify-center gap-6 px-6">
        <nav className="flex items-stretch gap-6 text-sm">
          {LEFT_NAV.map(renderLink)}
        </nav>
        <Link
          href="/"
          className="flex items-center font-heading text-sm font-semibold tracking-tight"
        >
          LEADGEN<span className="text-primary">.</span>
        </Link>
        <nav className="flex items-stretch gap-6 text-sm">
          {RIGHT_NAV.map(renderLink)}
        </nav>
      </div>
    </header>
  );
}
