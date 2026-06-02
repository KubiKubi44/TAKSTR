"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/kampane", label: "Kampaně" },
  { href: "/leady", label: "Leady" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-background/40 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-14 max-w-6xl items-stretch gap-8 px-6">
        <Link
          href="/"
          className="flex items-center font-heading text-sm font-semibold tracking-tight"
        >
          LEADGEN<span className="text-primary">.</span>
        </Link>
        <nav className="flex items-stretch gap-6 text-sm">
          {NAV.map((item) => (
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
          ))}
        </nav>
        <div className="ml-auto flex items-center font-mono text-xs text-muted-foreground">
          TB
        </div>
      </div>
    </header>
  );
}
