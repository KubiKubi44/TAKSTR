import type { LeadStatus } from "@/db/schema";

// Pořadí ve stavovém automatu / trychtýři.
export const LEAD_STATUS_ORDER: LeadStatus[] = [
  "discovered",
  "scored",
  "analyzed",
  "drafted",
  "sent",
  "replied",
  "meeting",
  "won",
  "dead",
];

// České popisky stavů.
export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  discovered: "Objeveno",
  scored: "Oskórováno",
  analyzed: "Zanalyzováno",
  drafted: "Draft",
  sent: "Odesláno",
  replied: "Odpověděl",
  meeting: "Schůzka",
  won: "Zakázka",
  dead: "Mrtvé",
};

// Stavy odlišené jemnými neutrálními odstíny + typografií (ne křiklavou barvou).
// Pozdní/pozitivní fáze dostanou tlumený amber akcent, "mrtvé" je ztlumené.
export const LEAD_STATUS_CLASS: Record<LeadStatus, string> = {
  discovered: "text-muted-foreground border-border",
  scored: "text-foreground border-border",
  analyzed: "text-foreground border-border",
  drafted: "text-foreground border-border",
  sent: "text-foreground border-foreground/30",
  replied: "text-primary border-primary/40",
  meeting: "text-primary border-primary/50",
  won: "text-primary border-primary/60 font-medium",
  dead: "text-muted-foreground/50 border-border/50 line-through",
};
