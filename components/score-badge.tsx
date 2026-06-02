import { cn } from "@/lib/utils";

// Skóre 0–100 jako mono číslo + tenký proužek. Vyšší = horší web = lepší lead.
export function ScoreBadge({
  score,
  className,
}: {
  score: number | null;
  className?: string;
}) {
  if (score === null || score === undefined) {
    return (
      <span className={cn("font-mono text-xs text-muted-foreground/40", className)}>
        —
      </span>
    );
  }
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="w-6 text-right font-mono text-sm tabular-nums">{score}</span>
      <span className="h-1 w-12 overflow-hidden bg-muted">
        <span
          className="block h-full bg-primary"
          style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
        />
      </span>
    </span>
  );
}
