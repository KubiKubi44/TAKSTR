import { fetchWithTimeout } from "./http";

// ARES — Administrativní registr ekonomických subjektů (data.gov.cz).
// Veřejné REST API, bez klíče. Z názvu firmy dotáhne IČO, sídlo, právní
// formu, datum vzniku a NACE (obor činnosti) — pro lepší prioritizaci leadů.

const ARES_SEARCH =
  "https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/vyhledat";

export interface AresResult {
  ico: string;
  name: string; // obchodní jméno z rejstříku
  address: string | null;
  legalForm: string | null; // čitelný název právní formy
  foundedAt: string | null; // YYYY-MM-DD
  nace: string[]; // kódy CZ-NACE
}

// Nejčastější právní formy (kód → label). Kompletní číselník je rozsáhlý;
// pokrýváme běžné, zbytek vrátíme jako kód.
const LEGAL_FORMS: Record<string, string> = {
  "100": "Podnikatel (OSVČ)",
  "101": "Fyzická osoba podnikající",
  "111": "Veřejná obchodní společnost",
  "112": "s.r.o.",
  "113": "Komanditní společnost",
  "121": "a.s.",
  "205": "Družstvo",
  "301": "Státní podnik",
  "421": "Odštěpný závod zahraniční osoby",
  "701": "Spolek",
  "751": "Nadace",
};

interface AresSubject {
  ico?: string;
  obchodniJmeno?: string;
  sidlo?: { textovaAdresa?: string };
  pravniForma?: string;
  datumVzniku?: string;
  czNace?: string[];
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\b(s\.?r\.?o\.?|a\.?s\.?|spol\.?|com|cz|s p|group)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Skóre shody názvů (0–1) — prefix/substring má přednost, jinak překryv slov.
function nameMatch(query: string, candidate: string): number {
  const a = normalize(query);
  const b = normalize(candidate);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (b.startsWith(a) || a.startsWith(b)) return 0.9;
  if (b.includes(a) || a.includes(b)) return 0.75;
  const wa = new Set(a.split(" "));
  const wb = new Set(b.split(" "));
  const inter = [...wa].filter((w) => wb.has(w)).length;
  return inter / Math.max(wa.size, wb.size);
}

// Vyhledá firmu v ARES podle názvu. Vrátí nejlepší shodu (nebo null),
// jen pokud je shoda dost důvěryhodná (≥ 0.5) — ať nepřiřadíme cizí firmu.
export async function lookupAres(businessName: string): Promise<AresResult | null> {
  const name = businessName.trim();
  if (!name) return null;

  const res = await fetchWithTimeout(ARES_SEARCH, {
    method: "POST",
    timeoutMs: 15000,
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ obchodniJmeno: name, pocet: 10, start: 0 }),
  });
  if (!res.ok) {
    throw new Error(`ARES vrátil ${res.status}.`);
  }

  const json = (await res.json()) as { ekonomickeSubjekty?: AresSubject[] };
  const subjects = json.ekonomickeSubjekty ?? [];
  if (subjects.length === 0) return null;

  let best: AresSubject | null = null;
  let bestScore = 0;
  for (const s of subjects) {
    const score = nameMatch(name, s.obchodniJmeno ?? "");
    if (score > bestScore) {
      bestScore = score;
      best = s;
    }
  }
  if (!best || !best.ico || bestScore < 0.5) return null;

  return {
    ico: best.ico,
    name: best.obchodniJmeno ?? name,
    address: best.sidlo?.textovaAdresa ?? null,
    legalForm: best.pravniForma
      ? (LEGAL_FORMS[best.pravniForma] ?? `kód ${best.pravniForma}`)
      : null,
    foundedAt: best.datumVzniku ?? null,
    nace: best.czNace ?? [],
  };
}
