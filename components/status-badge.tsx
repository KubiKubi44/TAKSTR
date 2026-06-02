import type { LeadStatus } from "@/db/schema";
import { LEAD_STATUS_CLASS, LEAD_STATUS_LABEL } from "@/lib/leadStatus";
import { cn } from "@/lib/utils";

export function StatusBadge({
  status,
  className,
}: {
  status: LeadStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider",
        LEAD_STATUS_CLASS[status],
        className,
      )}
    >
      {LEAD_STATUS_LABEL[status]}
    </span>
  );
}
