import * as cheerio from "cheerio";
import { fetchWithTimeout } from "./http";
import { extractPageSignals, type PageSignals } from "./signals";

// ─────────────────────────────────────────────────────────────
// Triáž = LEVNÉ skórování. Stáhne jen úvodní stránku, vytáhne
// hlavičkové signály a spočítá deterministické skóre 0–100.
// Žádný Claude, žádný plný text — to je až hloubková analýza (Fáze 3).
// ─────────────────────────────────────────────────────────────

// Skórovací rubrika — váhy v konstantě, ať se ladí.
// Vyšší skóre = horší web = lepší lead (víc to potřebuje předělat).
export const SCORING = {
  diyBuilder: 35, // WebSnadno / Wix / Webnode / … (amatérský stavebnicový web)
  noViewport: 30, // chybí <meta viewport> → nemobilní
  oldFooterYear: 20, // rok v patičce ≥ OLD_YEAR_THRESHOLD let zpět
  noHttps: 10, // web neběží na https
  noForeignLang: 5, // žádná cizojazyčná verze
} as const;

export const SCORE_MAX = 100;
export const OLD_YEAR_THRESHOLD = 3; // kolik let zpět už bereme jako "starý"

// Nejnovější 4místný rok nalezený v patičce (nebo kdekoliv v textu jako fallback).
function detectFooterYear(footerText: string, fullText: string): number | null {
  const now = new Date().getFullYear();
  const grab = (text: string): number | null => {
    const years = [...text.matchAll(/\b(19|20)\d{2}\b/g)]
      .map((m) => Number(m[0]))
      .filter((y) => y >= 1995 && y <= now + 1);
    return years.length ? Math.max(...years) : null;
  };
  return grab(footerText) ?? grab(fullText);
}

export interface TriageSignals extends PageSignals {
  footerYear: number | null;
  yearsStale: number | null;
  fetchedUrl: string;
  httpStatus: number;
}

export interface TriageResult {
  score: number;
  signals: TriageSignals;
  // dílčí body za jednotlivá kritéria (pro transparentnost v UI/activity)
  breakdown: Record<string, number>;
}

// Stáhne úvodní stránku a spočítá triážní skóre. Vyhazuje při síťové chybě.
export async function triageWebsite(url: string): Promise<TriageResult> {
  const res = await fetchWithTimeout(url, {
    timeoutMs: 15000,
    headers: { accept: "text/html,application/xhtml+xml" },
  });
  const finalUrl = res.url || url;
  const html = await res.text();
  const $ = cheerio.load(html);

  const base = extractPageSignals($, html, finalUrl);

  const footerText = $("footer").text() || $("body").text().slice(-800);
  const footerYear = detectFooterYear(footerText, $("body").text());
  const now = new Date().getFullYear();
  const yearsStale = footerYear !== null ? now - footerYear : null;

  const signals: TriageSignals = {
    ...base,
    footerYear,
    yearsStale,
    fetchedUrl: finalUrl,
    httpStatus: res.status,
  };

  const breakdown: Record<string, number> = {};
  if (base.isDiy) breakdown.diyBuilder = SCORING.diyBuilder;
  if (!base.hasViewport) breakdown.noViewport = SCORING.noViewport;
  if (yearsStale !== null && yearsStale >= OLD_YEAR_THRESHOLD)
    breakdown.oldFooterYear = SCORING.oldFooterYear;
  if (!base.isHttps) breakdown.noHttps = SCORING.noHttps;
  if (!base.hasForeignLang) breakdown.noForeignLang = SCORING.noForeignLang;

  const score = Math.min(
    SCORE_MAX,
    Object.values(breakdown).reduce((a, b) => a + b, 0),
  );

  return { score, signals, breakdown };
}
