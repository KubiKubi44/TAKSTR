// Normalizace webové adresy pro deduplikaci a stahování.
// Sjednotí protokol, malá písmena v hostu, odstraní koncové lomítko a fragment.
export function normalizeWebsiteUrl(raw: string): string | null {
  let input = raw.trim();
  if (!input) return null;
  if (!/^https?:\/\//i.test(input)) input = `https://${input}`;
  try {
    const u = new URL(input);
    u.hash = "";
    u.hostname = u.hostname.toLowerCase();
    // koncové lomítko u kořene pryč, ať "example.com/" == "example.com"
    let out = u.toString();
    if (u.pathname === "/" && !u.search) out = out.replace(/\/$/, "");
    return out;
  } catch {
    return null;
  }
}

// Host bez "www." — fallback pro business_name, když OSM nemá `name` tag.
export function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

// Domény, které nejsou „vlastní web" — POI je má často jako jediný odkaz.
const SOCIAL_HOSTS = [
  "facebook.com",
  "fb.com",
  "fb.me",
  "instagram.com",
  "twitter.com",
  "x.com",
  "tiktok.com",
  "youtube.com",
  "youtu.be",
  "linkedin.com",
];

// True, když „web" leadu je ve skutečnosti jen profil na sociální síti.
export function isSocialUrl(url: string): boolean {
  const host = hostnameOf(url);
  if (!host) return false;
  return SOCIAL_HOSTS.some((s) => host === s || host.endsWith(`.${s}`));
}
