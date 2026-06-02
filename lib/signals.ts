import type { CheerioAPI } from "cheerio";

// Sdílená detekce signálů z HTML — používá levná triáž (Fáze 2)
// i hloubková analýza (Fáze 3), ať se logika neduplikuje.

export interface PageSignals {
  builder: string | null;
  isDiy: boolean;
  hasViewport: boolean;
  isHttps: boolean;
  langs: string[];
  hasForeignLang: boolean;
}

// Detekce builderu/enginu. Stavebnicové buildery (diy:true) = silný
// signál k předělání.
export function detectBuilder(
  html: string,
  generator: string | null,
): { builder: string | null; isDiy: boolean } {
  const hay = `${html.toLowerCase()} ${(generator ?? "").toLowerCase()}`;
  const checks: Array<{ label: string; needles: string[]; diy: boolean }> = [
    { label: "WebSnadno", needles: ["websnadno", "wbs.cz"], diy: true },
    { label: "Wix", needles: ["wix.com", "_wixcssimports", "wixstatic"], diy: true },
    { label: "Webnode", needles: ["webnode"], diy: true },
    { label: "eStránky", needles: ["estranky", "estranky.cz"], diy: true },
    { label: "uCoz", needles: ["ucoz"], diy: true },
    { label: "Webgarden", needles: ["webgarden"], diy: true },
    { label: "Mozello", needles: ["mozello"], diy: true },
    { label: "Shoptet", needles: ["shoptet"], diy: false },
    { label: "Squarespace", needles: ["squarespace"], diy: false },
    { label: "WordPress", needles: ["wp-content", "wp-includes"], diy: false },
    { label: "Joomla", needles: ["joomla"], diy: false },
  ];
  for (const c of checks) {
    if (c.needles.some((n) => hay.includes(n))) {
      return { builder: c.label, isDiy: c.diy };
    }
  }
  return { builder: null, isDiy: false };
}

// Společné signály z načtené stránky: builder, mobil (viewport), https, jazyky.
export function extractPageSignals(
  $: CheerioAPI,
  html: string,
  finalUrl: string,
): PageSignals {
  const generator = $('meta[name="generator"]').attr("content") ?? null;
  const { builder, isDiy } = detectBuilder(html, generator);

  const hasViewport = $('meta[name="viewport"]').length > 0;
  const isHttps = finalUrl.startsWith("https://");

  // jazyky: hreflang odkazy + /en, /de … cesty + lang atribut
  const langs = new Set<string>();
  $("link[hreflang]").each((_, el) => {
    const l = $(el).attr("hreflang");
    if (l) langs.add(l.toLowerCase().split("-")[0]);
  });
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const m = href.match(/\/(en|de|ru|pl|fr|es)(\/|$)/i);
    if (m) langs.add(m[1].toLowerCase());
  });
  const htmlLang = ($("html").attr("lang") ?? "").toLowerCase().split("-")[0];
  const foreign = [...langs].filter(
    (l) => l && l !== "cs" && l !== "sk" && l !== htmlLang,
  );

  return {
    builder,
    isDiy,
    hasViewport,
    isHttps,
    langs: [...langs],
    hasForeignLang: foreign.length > 0,
  };
}
