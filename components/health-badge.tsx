"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type State = "loading" | "up" | "down";

export function HealthBadge({ url }: { url: string }) {
  const [state, setState] = useState<State>("loading");
  const [info, setInfo] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch(`/api/health?url=${encodeURIComponent(url)}`);
        const d = (await r.json()) as { ok: boolean; status: number | null; ms: number | null };
        if (!alive) return;
        setState(d.ok ? "up" : "down");
        setInfo(d.ok ? `${d.status} · ${d.ms} ms` : d.status ? `HTTP ${d.status}` : "nedostupný");
      } catch {
        if (alive) {
          setState("down");
          setInfo("chyba");
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [url]);

  const dot =
    state === "up"
      ? "bg-primary"
      : state === "down"
        ? "bg-destructive"
        : "bg-muted-foreground animate-pulse";
  const label =
    state === "loading" ? "kontroluji…" : state === "up" ? "online" : "offline";

  return (
    <span className="inline-flex items-center gap-1.5 border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
      <span className={cn("size-1.5 rounded-full", dot)} />
      {label}
      {info && state !== "loading" && (
        <span className="text-muted-foreground/60">· {info}</span>
      )}
    </span>
  );
}
