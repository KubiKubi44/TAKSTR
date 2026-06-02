import * as cheerio from "cheerio";
import { fetchWithTimeout } from "./http";
import { extractPageSignals, type PageSignals } from "./signals";
import { hostnameOf } from "./url";

// Hloubková analýza vybraného leadu: plné stažení stránky + cheerio.
// Oproti levné triáži navíc: kontaktní e-mail, čistý text (~6000 znaků)
// a volitelně PageSpeed. Výstup se ukládá do site_analysis.

const TEXT_EXCERPT_MAX = 6000;

// přípony, které vypadají jako e-mail, ale jsou to obrázky/soubory
const IMAGE_LIKE = /\.(png|jpe?g|gif|svg|webp|bmp|ico|tiff?)$/i;
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;

function extractEmail($: cheerio.CheerioAPI, html: string, siteHost: string | null): string | null {
  const candidates: string[] = [];

  // 1) mailto: odkazy (nejspolehlivější)
  $('a[href^="mailto:"]').each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const addr = decodeURIComponent(href.replace(/^mailto:/i, "").split("?")[0]).trim();
    if (addr) candidates.push(addr);
  });

  // 2) regex přes text i HTML
  for (const m of html.matchAll(EMAIL_RE)) candidates.push(m[0]);

  const clean = candidates
    .map((e) => e.toLowerCase().trim())
    .filter((e) => e.includes("@") && !IMAGE_LIKE.test(e))
    // odfiltruj zjevné tracking/placeholder adresy
    .filter((e) => !/^(example|email|name|user)@/.test(e))
    .filter((e) => !e.endsWith("@2x") && !e.includes("@sentry"));

  if (clean.length === 0) return null;

  // preferuj adresu na stejné doméně jako web
  if (siteHost) {
    const root = siteHost.replace(/^www\./, "");
    const sameDomain = clean.find((e) => e.split("@")[1]?.endsWith(root));
    if (sameDomain) return sameDomain;
  }
  return clean[0];
}

function extractText($: cheerio.CheerioAPI): string {
  $("script, style, noscript, svg, template").remove();
  const raw = $("body").text() || $.root().text();
  return raw.replace(/\s+/g, " ").trim().slice(0, TEXT_EXCERPT_MAX);
}

// PageSpeed Insights (volitelné). Bez klíče vrací null.
async function fetchPageSpeed(url: string): Promise<number | null> {
  const key = process.env.PAGESPEED_API_KEY;
  if (!key) return null;
  try {
    const api = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(
      url,
    )}&strategy=mobile&category=performance&key=${key}`;
    const res = await fetchWithTimeout(api, { timeoutMs: 30000 });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      lighthouseResult?: { categories?: { performance?: { score?: number } } };
    };
    const score = json.lighthouseResult?.categories?.performance?.score;
    return typeof score === "number" ? Math.round(score * 100) : null;
  } catch {
    return null;
  }
}

export interface AnalyzerResult {
  builder: string | null;
  mobileOk: boolean;
  hasEn: boolean;
  pagespeed: number | null;
  contactEmail: string | null;
  textExcerpt: string;
  // do site_analysis.signals (jsonb) — cokoliv navíc bez změny schématu
  signals: PageSignals & {
    fetchedUrl: string;
    httpStatus: number;
    hasEn: boolean;
    contactEmail: string | null;
  };
}

export async function analyzeWebsite(url: string): Promise<AnalyzerResult> {
  const res = await fetchWithTimeout(url, {
    timeoutMs: 20000,
    headers: { accept: "text/html,application/xhtml+xml" },
  });
  const finalUrl = res.url || url;
  const html = await res.text();
  const $ = cheerio.load(html);

  const base = extractPageSignals($, html, finalUrl);
  const hasEn = base.langs.includes("en");
  const contactEmail = extractEmail($, html, hostnameOf(finalUrl));
  const textExcerpt = extractText($);
  const pagespeed = await fetchPageSpeed(finalUrl);

  return {
    builder: base.builder,
    mobileOk: base.hasViewport,
    hasEn,
    pagespeed,
    contactEmail,
    textExcerpt,
    signals: {
      ...base,
      fetchedUrl: finalUrl,
      httpStatus: res.status,
      hasEn,
      contactEmail,
    },
  };
}
