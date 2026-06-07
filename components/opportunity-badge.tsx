import { cn } from "@/lib/utils";
import type { OpportunityScore } from "@/lib/opportunity";

// Kompozitní „příležitost" 0–100 + zlatý indikátor (prosperující firma se
// špatným webem). Tón proužku se zvedá s hodnotou; zlatý lead je amber.
export function OpportunityBadge({
  opp,
  className,
}: {
  opp: OpportunityScore;
  className?: string;
}) {
  const tone = opp.gold
    ? "bg-gold"
    : opp.score >= 65
      ? "bg-success"
      : "bg-muted-foreground/50";

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="w-6 text-right font-mono text-sm tabular-nums">{opp.score}</span>
      <span className="h-1 w-12 overflow-hidden bg-muted">
        <span
          className={cn("block h-full", tone)}
          style={{ width: `${Math.max(0, Math.min(100, opp.score))}%` }}
        />
      </span>
      {opp.gold && (
        <span
          title="Zlatý lead: prosperující firma se špatným webem"
          className="font-mono text-[10px] font-semibold uppercase tracking-wider text-gold"
        >
          ★ zlatý
        </span>
      )}
    </span>
  );
}
