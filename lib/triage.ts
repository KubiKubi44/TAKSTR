import * as cheerio from "cheerio";
import { fetchWithTimeout } from "./http";

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

// Detekce builderu z HTML — vrací label (i pro ne-DIY) a příznak isDiy.
// Stavebnicové/amatérské buildery (diy:true) = silný signál k předělání.
function detectBuilder(html: string, generator: string | null): {
  builder: string | null;
  isDiy: boolean;
} {
  const hay = `${html.toLowerCase()} ${(generator ?? "").toLowerCase()}`;
  const checks: Array<{ id: string; label: string; needles: string[]; diy: boolean }> = [
    { id: "websnadno", label: "WebSnadno", needles: ["websnadno", "wbs.cz"], diy: true },
    { id: "wix", label: "Wix", needles: ["wix.com", "_wixcssimports", "wixstatic"], diy: true },
    { id: "webnode", label: "Webnode", needles: ["webnode"], diy: true },
    { id: "estranky", label: "eStránky", needles: ["estranky", "estranky.cz"], diy: true },
    { id: "ucoz", label: "uCoz", needles: ["ucoz"], diy: true },
    { id: "webgarden", label: "Webgarden", needles: ["webgarden"], diy: true },
    { id: "mozello", label: "Mozello", needles: ["mozello"], diy: true },
    { id: "shoptet", label: "Shoptet", needles: ["shoptet"], diy: false },
    { id: "squarespace", label: "Squarespace", needles: ["squarespace"], diy: false },
    { id: "wordpress", label: "WordPress", needles: ["wp-content", "wp-includes"], diy: false },
    { id: "joomla", label: "Joomla", needles: ["joomla"], diy: false },
  ];
  for (const c of checks) {
    if (c.needles.some((n) => hay.includes(n))) {
      return { builder: c.label, isDiy: c.diy };
    }
  }
  return { builder: null, isDiy: false };
}

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

export interface TriageSignals {
  builder: string | null;
  isDiy: boolean;
  hasViewport: boolean;
  isHttps: boolean;
  footerYear: number | null;
  yearsStale: number | null;
  langs: string[];
  hasForeignLang: boolean;
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

  const generator = $('meta[name="generator"]').attr("content") ?? null;
  const { builder, isDiy } = detectBuilder(html, generator);

  const hasViewport = $('meta[name="viewport"]').length > 0;
  const isHttps = finalUrl.startsWith("https://");

  // jazyky: hreflang odkazy + /en, /de cesty v navigaci + lang atribut
  const langs = new Set<string>();
  $("link[hreflang]").each((_, el) => {
    const l = $(el).attr("hreflang");
    if (l) langs.add(l.toLowerCase().split("-")[0]);
  });
  $('a[href]').each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const m = href.match(/\/(en|de|ru|pl|fr|es)(\/|$)/i);
    if (m) langs.add(m[1].toLowerCase());
  });
  const htmlLang = ($("html").attr("lang") ?? "").toLowerCase().split("-")[0];
  // cizojazyčná verze = existuje jiný jazyk než čeština/slovenština
  const foreign = [...langs].filter(
    (l) => l && l !== "cs" && l !== "sk" && l !== htmlLang,
  );
  const hasForeignLang = foreign.length > 0;

  const footerText = $("footer").text() || $("body").text().slice(-800);
  const footerYear = detectFooterYear(footerText, $("body").text());
  const now = new Date().getFullYear();
  const yearsStale = footerYear !== null ? now - footerYear : null;

  const signals: TriageSignals = {
    builder,
    isDiy,
    hasViewport,
    isHttps,
    footerYear,
    yearsStale,
    langs: [...langs],
    hasForeignLang,
    fetchedUrl: finalUrl,
    httpStatus: res.status,
  };

  const breakdown: Record<string, number> = {};
  if (isDiy) breakdown.diyBuilder = SCORING.diyBuilder;
  if (!hasViewport) breakdown.noViewport = SCORING.noViewport;
  if (yearsStale !== null && yearsStale >= OLD_YEAR_THRESHOLD)
    breakdown.oldFooterYear = SCORING.oldFooterYear;
  if (!isHttps) breakdown.noHttps = SCORING.noHttps;
  if (!hasForeignLang) breakdown.noForeignLang = SCORING.noForeignLang;

  const score = Math.min(
    SCORE_MAX,
    Object.values(breakdown).reduce((a, b) => a + b, 0),
  );

  return { score, signals, breakdown };
}
