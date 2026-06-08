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

// Pro koho je úkol — ať každý ví, co je jeho.
export const ASSIGNEES = ["tomis", "kubis", "osobni"] as const;
export type Assignee = (typeof ASSIGNEES)[number];

export const ASSIGNEE_LABEL: Record<string, string> = {
  tomis: "Tomiš",
  kubis: "Kubiš",
  osobni: "Osobní",
};

// barevný odznak přiřazení (na kartě)
export const ASSIGNEE_CHIP: Record<string, string> = {
  tomis: "border-info/50 text-info",
  kubis: "border-iris/50 text-iris",
  osobni: "border-gold/50 text-gold",
};
