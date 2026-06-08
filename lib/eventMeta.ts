// Typy událostí v kalendáři + barvy. Sdílí kalendář i dialogy.

export const EVENT_KINDS = ["meeting", "followup", "invoice", "other"] as const;
export type EventKindKey = (typeof EVENT_KINDS)[number];

export const EVENT_KIND_LABEL: Record<string, string> = {
  meeting: "Schůzka",
  followup: "Follow-up",
  invoice: "Fakturace",
  other: "Vlastní",
};

// výchozí barevný token podle typu (když není zvolená vlastní barva)
export const EVENT_KIND_COLOR: Record<string, string> = {
  meeting: "info",
  followup: "iris",
  invoice: "gold",
  other: "success",
};

// paleta vlastních barev k výběru
export const EVENT_COLORS = [
  "info",
  "iris",
  "gold",
  "success",
  "rose",
  "cyan",
  "slate",
] as const;

export const COLOR_LABEL: Record<string, string> = {
  info: "Modrá",
  iris: "Fialová",
  gold: "Zlatá",
  success: "Zelená",
  rose: "Růžová",
  cyan: "Tyrkysová",
  slate: "Šedá",
};

export const COLOR_CHIP: Record<string, string> = {
  info: "bg-info/25 text-info border-info/55",
  iris: "bg-iris/25 text-iris border-iris/55",
  gold: "bg-gold/25 text-gold border-gold/55",
  success: "bg-success/25 text-success border-success/55",
  rose: "bg-rose-500/22 text-rose-500 border-rose-500/50",
  cyan: "bg-cyan-500/22 text-cyan-500 border-cyan-500/50",
  slate: "bg-foreground/10 text-foreground border-foreground/30",
};

export const COLOR_TEXT: Record<string, string> = {
  info: "text-info",
  iris: "text-iris",
  gold: "text-gold",
  success: "text-success",
  rose: "text-rose-500",
  cyan: "text-cyan-500",
  slate: "text-muted-foreground",
};

export const COLOR_DOT: Record<string, string> = {
  info: "bg-info",
  iris: "bg-iris",
  gold: "bg-gold",
  success: "bg-success",
  rose: "bg-rose-500",
  cyan: "bg-cyan-500",
  slate: "bg-foreground/60",
};

// vyřeší barevný token události: vlastní barva, jinak dle typu
export function eventColorToken(e: { kind: string; color?: string | null }): string {
  if (e.color && COLOR_CHIP[e.color]) return e.color;
  return EVENT_KIND_COLOR[e.kind] ?? "slate";
}
