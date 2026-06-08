import type { TaskPriority } from "@/db/schema";

export const PRIORITY_DOT: Record<TaskPriority, string> = {
  high: "bg-destructive",
  normal: "bg-primary",
  low: "bg-muted-foreground/40",
};

// barevný proužek priority na kartě (kanban)
export const PRIORITY_BAR: Record<TaskPriority, string> = {
  high: "bg-destructive",
  normal: "bg-info",
  low: "bg-muted-foreground/40",
};

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  high: "Vysoká",
  normal: "Střední",
  low: "Nízká",
};

export const PRIORITIES: TaskPriority[] = ["high", "normal", "low"];
