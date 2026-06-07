import * as cheerio from "cheerio";
import { fetchWithTimeout } from "./http";
import { db } from "@/db/client";
import { demandLead } from "@/db/schema";
import { sendMessage } from "./telegram";

// Monitor teplé poptávky z portálů (Poptávej.cz, ePoptávka.cz): někdo veřejně
// shání „web / e-shop / SEO". Stáhneme veřejné výpisy (robots.txt to dovoluje),
// vyfiltrujeme webové/IT poptávky a nové zařadíme + pošleme do Telegramu.
//
// Pozn.: výpisy jsou HTML bez stabilního API — adaptéry jsou best-effort,
// při změně markupu vrátí 0 (a je třeba je doladit).

// Prohlížečová hlavička — portály neodpovídají na holý fetch stejně.
const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

// Co nás zajímá (web/app/eshop/marketing) a co naopak ne (hardware/komodity).
const POSITIVE =
  /web|www|e-?shop|e-?commerce|stránk|prezentac|aplikac|mobiln|software|systém|portál|redesign|seo|ppc|sklik|grafik|logo|brand|marketing|kampaň|newsletter|doména|hosting|landing|wordpress|shoptet|programát|kód|integrac/i;
const NEGATIVE =
  /notebook| noteb|tiskárn|toner|náplň|monitor\b|počítač(e|ů|)\b|pc sestav|paměť|ddr[0-9]|procesor|pevný disk|ssd\b|repasovan|licenc|office\b|server(y|ů|)\b|kabel|router\b|patice|čteč/i;

function isRelevant(title: string): boolean {
  return POSITIVE.test(title) && !NEGATIVE.test(title);
}

export interface DemandItem {
  source: string;
  externalId: string;
  title: string;
  url: string;
  category: string | null;
  postedAt: Date | null;
}

// České datum „4. 6. 2026" i „5.6.2026" → Date (půlnoc UTC). null při neúspěchu.
function parseCzDate(s: string): Date | null {
  const m = s.match(/(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1])));
  return Number.isNaN(d.getTime()) ? null : d;
}

async function getHtml(url: string): Promise<cheerio.CheerioAPI | null> {
  try {
    const res = await fetchWithTimeout(url, {
      timeoutMs: 15000,
      headers: { "user-agent": BROWSER_UA, accept: "text/html" },
    });
    if (!res.ok) return null;
    return cheerio.load(await res.text());
  } catch {
    return null;
  }
}

// Z odkazu /poptavka/{id}-{slug} vytáhne číselné id (dedup nezávislý na slugu).
function idFromPoptavkaHref(href: string): string | null {
  const m = href.match(/\/poptavka\/(\d+)/);
  return m ? m[1] : null;
}

// ── Poptávej.cz — obecný výpis (řádky s datem + oborem) ──────
async function fetchPoptavej(): Promise<DemandItem[]> {
  const $ = await getHtml("https://www.poptavej.cz/poptavky");
  if (!$) return [];
  const out = new Map<string, DemandItem>();
  $(".row.demand").each((_, row) => {
    const $r = $(row);
    const a = $r.find('.nazev a[href^="/poptavka/"]').first();
    const href = a.attr("href") ?? "";
    const id = idFromPoptavkaHref(href);
    const title = a.text().replace(/\s+/g, " ").trim();
    if (!id || title.length < 6 || !isRelevant(title)) return;
    out.set(id, {
      source: "poptavej",
      externalId: id,
      title,
      url: `https://www.poptavej.cz${href}`,
      category: $r.find("a.category").first().text().trim() || null,
      postedAt: parseCzDate($r.find(".date").first().text()),
    });
  });
  return [...out.values()];
}

// ── ePoptávka.cz — kategorie blízké webu/marketingu ──────────
const EPOPTAVKA_CATEGORIES = ["it-software", "reklama"];

async function fetchEpoptavka(): Promise<DemandItem[]> {
  const out = new Map<string, DemandItem>();
  for (const cat of EPOPTAVKA_CATEGORIES) {
    const $ = await getHtml(`https://poptavky.epoptavka.cz/${cat}`);
    if (!$) continue;
    $('a[href*="/poptavka/"]').each((_, el) => {
      const $a = $(el);
      const href = $a.attr("href") ?? "";
      const id = idFromPoptavkaHref(href);
      // titulek z <h4> (kartový odkaz); fallback ze slugu
      let title = $a.find("h4").text().replace(/\s+/g, " ").trim();
      if (!title) {
        const slug = href.match(/\/poptavka\/\d+-([a-z0-9-]+)/)?.[1];
        if (slug) title = slug.replace(/-/g, " ");
      }
      if (!id || title.length < 6 || !isRelevant(title)) return;
      const url = href.startsWith("http") ? href : `https://poptavky.epoptavka.cz${href}`;
      // datum: <i class="fa-calendar"></i> 4. 6. 2026 v sousedním <ul>
      const dateText = $a.parent().find("i.fa-calendar").first().parent().text();
      out.set(id, {
        source: "epoptavka",
        externalId: id,
        title,
        url,
        category: cat,
        postedAt: parseCzDate(dateText),
      });
    });
  }
  return [...out.values()];
}

// Registr zdrojů — přidání dalšího portálu = jen další položka.
// (Freelance.cz je SPA s neveřejným JSON API — TODO reverse-engineer.)
export const DEMAND_SOURCES: Array<() => Promise<DemandItem[]>> = [
  fetchPoptavej,
  fetchEpoptavka,
];

export async function collectDemand(): Promise<DemandItem[]> {
  const results = await Promise.allSettled(DEMAND_SOURCES.map((fn) => fn()));
  return results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
}

// Stáhne, uloží nové (dedup dle source+externalId) a pošle souhrn do Telegramu.
export async function pollDemand(): Promise<{
  found: number;
  added: number;
  items: DemandItem[];
}> {
  const items = await collectDemand();
  const added: DemandItem[] = [];

  for (const it of items) {
    const [row] = await db
      .insert(demandLead)
      .values({
        source: it.source,
        externalId: it.externalId,
        title: it.title,
        url: it.url,
        category: it.category,
        postedAt: it.postedAt,
      })
      .onConflictDoNothing({
        target: [demandLead.source, demandLead.externalId],
      })
      .returning({ id: demandLead.id });
    if (row) added.push(it);
  }

  if (added.length > 0) await notifyDemand(added);

  return { found: items.length, added: added.length, items: added };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function notifyDemand(items: DemandItem[]): Promise<void> {
  if (!process.env.TELEGRAM_BOT_TOKEN) return;
  const user = await db.query.appUser.findFirst();
  const chatId = user?.telegramChatId;
  if (!chatId) return;

  const lines = items
    .slice(0, 12)
    .map((it) => `• <a href="${it.url}">${escapeHtml(it.title)}</a> <i>(${it.source})</i>`);
  const more = items.length > 12 ? `\n…a další ${items.length - 12}` : "";
  const text = `🔔 <b>Nové poptávky (${items.length})</b>\n${lines.join("\n")}${more}`;
  await sendMessage(chatId, text).catch(() => {});
}
