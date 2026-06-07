// Skóre „zlatý lead" — kombinuje POTŘEBU (špatný web), BONITU (firma má peníze)
// a DOSAŽITELNOST (jde oslovit) do jednoho čísla 0–100.
// Cíl: nahoru řadit *prosperující firmu se špatným webem*, ne kdekoho.
//
// Vstupy už máme na řádku leadu — triážní score, flags (z triáže),
// enrichment (ARES + Google hodnocení) a kontakt. Žádný dotaz navíc.

export interface OpportunityInput {
  score: number | null; // triážní skóre 0–100 (vyšší = horší web)
  flags: Record<string, unknown>;
  enrichment: Record<string, unknown>;
  contactEmail: string | null;
  phone: string | null;
}

export interface OpportunityScore {
  score: number; // kompozit 0–100
  need: number; // potřeba (0–100)
  money: number; // bonita (0–100)
  reach: number; // dosažitelnost (0–100)
  gold: boolean; // prosperující + špatný web + dosažitelný
  moneyKnown: boolean; // false → doporuč „Obohatit"
  reasons: string[];
}

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const num = (v: unknown): number | null => (typeof v === "number" ? v : null);

// Váhy kompozitu. Potřeba a bonita dominují; dosažitelnost dolaďuje.
const W_NEED = 0.45;
const W_MONEY = 0.35;
const W_REACH = 0.2;

export function computeOpportunity(input: OpportunityInput): OpportunityScore {
  const reasons: string[] = [];
  const f = input.flags ?? {};
  const e = input.enrichment ?? {};

  // ── POTŘEBA ──────────────────────────────────────────────
  const socialOnly = !!(f.socialOnly || f.noRealWebsite);
  const unreachable = !!f.websiteUnreachable;
  let need: number;
  if (socialOnly) {
    need = 85;
    reasons.push("jen sociální síť");
  } else if (unreachable) {
    need = 75;
    reasons.push("web nedostupný");
  } else if (input.score != null) {
    need = input.score;
    if (input.score >= 60) reasons.push(`slabý web (${input.score}/100)`);
  } else {
    need = 40; // neznámé (ruční/telegram lead bez triáže)
  }

  // ── BONITA (má firma peníze?) ────────────────────────────
  let money = 40;
  let moneyKnown = false;

  const legalForm = typeof e.legalForm === "string" ? e.legalForm : null;
  if (legalForm) {
    moneyKnown = true;
    if (/a\.s\./i.test(legalForm)) money = 66;
    else if (/s\.r\.o\./i.test(legalForm)) money = 58;
    else money = 48; // OSVČ / spolek / …
    reasons.push(legalForm);
  }

  const reviews = num(e.reviews);
  if (reviews != null) {
    moneyKnown = true;
    const r =
      reviews >= 200 ? 35 : reviews >= 80 ? 27 : reviews >= 30 ? 18 : reviews >= 10 ? 9 : reviews >= 1 ? 3 : 0;
    money += r;
    reasons.push(`${reviews} recenzí`);
  }

  const rating = num(e.rating);
  if (rating != null) {
    moneyKnown = true;
    money += rating >= 4.5 ? 8 : rating >= 4.0 ? 5 : rating >= 3.0 ? 2 : 0;
    reasons.push(`${rating.toFixed(1)}★`);
  }

  money = clamp(money);
  if (!moneyKnown) reasons.push("bonita neznámá — obohať");

  // ── DOSAŽITELNOST ────────────────────────────────────────
  let reach: number;
  if (input.contactEmail) reach = 100;
  else if (input.phone) {
    reach = 55;
    reasons.push("jen telefon");
  } else {
    reach = 25;
    reasons.push("chybí kontakt");
  }

  const score = Math.round(W_NEED * need + W_MONEY * money + W_REACH * reach);

  // „Zlatý": prokazatelně bonitní (ne jen domněnka) + reálná potřeba + dosažitelný
  const gold = moneyKnown && need >= 60 && money >= 62 && reach >= 40;

  return { score, need, money, reach, gold, moneyKnown, reasons };
}
