import * as cheerio from "cheerio";
import { fetchWithTimeout } from "./http";
import { extractPageSignals, type PageSignals } from "./signals";
import { checkDomainExpiry, checkTls, registrableDomain } from "./techcheck";
import { hostnameOf } from "./url";

// Hloubková analýza vybraného leadu: plné stažení stránky + cheerio.
// Oproti levné triáži navíc: kontaktní e-mail, čistý text (~6000 znaků)
// a volitelně PageSpeed. Výstup se ukládá do site_analysis.

const TEXT_EXCERPT_MAX = 6000;
const STALE_YEARS = 3; // rok v patičce takhle starý = zanedbaný web

// Nejnovější 4místný rok z patičky (fallback celý text). Stará = zanedbaná.
function detectFooterYear($: cheerio.CheerioAPI): number | null {
  const now = new Date().getFullYear();
  const footer = $("footer").text() || $("body").text().slice(-800);
  const grab = (text: string): number | null => {
    const years = [...text.matchAll(/\b(19|20)\d{2}\b/g)]
      .map((m) => Number(m[0]))
      .filter((y) => y >= 1995 && y <= now + 1);
    return years.length ? Math.max(...years) : null;
  };
  return grab(footer) ?? grab($("body").text());
}

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

// Příznaky „umírajícího" webu pro lead.flags (zvedají skóre příležitosti).
export interface TechFlags {
  noHttps?: boolean;
  sslExpired?: boolean;
  domainExpiringSoon?: boolean;
  techStale?: boolean;
}

export interface AnalyzerResult {
  builder: string | null;
  mobileOk: boolean;
  hasEn: boolean;
  pagespeed: number | null;
  contactEmail: string | null;
  textExcerpt: string;
  // příznaky k zapsání do lead.flags (merge)
  flags: TechFlags;
  // do site_analysis.signals (jsonb) — cokoliv navíc bez změny schématu
  signals: PageSignals & {
    fetchedUrl: string;
    httpStatus: number;
    hasEn: boolean;
    contactEmail: string | null;
    generator: string | null;
    footerYear: number | null;
    yearsStale: number | null;
    httpsOk: boolean;
    sslValid: boolean;
    sslDaysLeft: number | null;
    domainExpiresAt: string | null;
    domainDaysLeft: number | null;
    problems: string[];
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
  const generator = $('meta[name="generator"]').attr("content") ?? null;

  const now = new Date().getFullYear();
  const footerYear = detectFooterYear($);
  const yearsStale = footerYear != null ? now - footerYear : null;

  const host = hostnameOf(finalUrl);
  const domain = host ? registrableDomain(host) : null;

  // SSL, doména a PageSpeed paralelně — každé best-effort
  const [pagespeed, tls, domainExp] = await Promise.all([
    fetchPageSpeed(finalUrl),
    host ? checkTls(host) : Promise.resolve(null),
    domain ? checkDomainExpiry(domain) : Promise.resolve(null),
  ]);

  const httpsOk = base.isHttps && (tls?.valid ?? false);
  const sslValid = tls?.valid ?? false;
  const sslDaysLeft = tls?.daysLeft ?? null;
  const domainDaysLeft = domainExp?.daysLeft ?? null;

  // odvozené příznaky
  const sslExpired = base.isHttps && tls != null && (!tls.valid || (sslDaysLeft != null && sslDaysLeft < 0));
  const domainExpiringSoon = domainDaysLeft != null && domainDaysLeft < 45;
  const techStale = base.isDiy || (yearsStale != null && yearsStale >= STALE_YEARS);

  const problems: string[] = [];
  if (!base.isHttps) problems.push("web neběží na HTTPS");
  else if (sslExpired) problems.push("neplatný / prošlý SSL certifikát");
  else if (sslDaysLeft != null && sslDaysLeft < 21) problems.push(`SSL vyprší za ${sslDaysLeft} dní`);
  if (domainExpiringSoon)
    problems.push(domainDaysLeft! < 0 ? "doména po expiraci" : `doména vyprší za ${domainDaysLeft} dní`);
  if (yearsStale != null && yearsStale >= STALE_YEARS) problems.push(`patička z roku ${footerYear}`);
  if (base.isDiy) problems.push(`stavebnicový web (${base.builder})`);
  if (!base.hasViewport) problems.push("není uzpůsoben mobilu");

  const flags: TechFlags = {};
  if (!base.isHttps) flags.noHttps = true;
  if (sslExpired) flags.sslExpired = true;
  if (domainExpiringSoon) flags.domainExpiringSoon = true;
  if (techStale) flags.techStale = true;

  return {
    builder: base.builder,
    mobileOk: base.hasViewport,
    hasEn,
    pagespeed,
    contactEmail,
    textExcerpt,
    flags,
    signals: {
      ...base,
      fetchedUrl: finalUrl,
      httpStatus: res.status,
      hasEn,
      contactEmail,
      generator,
      footerYear,
      yearsStale,
      httpsOk,
      sslValid,
      sslDaysLeft,
      domainExpiresAt: domainExp?.expiresAt ?? null,
      domainDaysLeft,
      problems,
    },
  };
}
