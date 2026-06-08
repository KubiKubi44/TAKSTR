import { fetchWithTimeout } from "./http";

// Discovery přes OpenStreetMap / Overpass API — bez klíče, bez karty.
// Nahrazuje Google Places ze spec. Vrací jen POI, které mají web
// (bez webu nemáme co oslovit).

// Veřejné Overpass instance jsou flaky a z cloud IP (Vercel) občas resetují
// spojení („fetch failed"). Zkoušíme víc mirrorů po sobě, dokud jeden nevyjde.
// Z Vercelu (AWS IP) většina veřejných Overpass odmítá spojení; kumi se ozve
// (jen pomalu). Rychlé de/lz4 zkusíme první (lokálně/jinde fungují), kumi je
// spolehlivá pojistka s dlouhým timeoutem.
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org/search";

// Pošle Overpass dotaz na první funkční mirror. Při chybě spojení / 429 / 5xx
// zkusí další; selže až když selžou všechny (s jasnou hláškou).
async function overpassRequest(ql: string): Promise<Response> {
  const body = new URLSearchParams({ data: ql }).toString();
  const errors: string[] = [];
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetchWithTimeout(endpoint, {
        method: "POST",
        // de/lz4 selžou na spojení rychle; kumi se ozve pomalu → dlouhý timeout
        timeoutMs: 45000,
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body,
      });
      if (res.ok) return res;
      if (res.status === 429 || res.status >= 500) {
        errors.push(`${endpoint} → ${res.status}`);
        continue; // přetížený / chyba serveru → zkus další mirror
      }
      const t = await res.text().catch(() => "");
      throw new Error(`Overpass vrátil ${res.status}: ${t.slice(0, 200)}`);
    } catch (err) {
      errors.push(`${endpoint} → ${(err as Error).message}`);
    }
  }
  throw new Error(`Overpass nedostupný (${OVERPASS_ENDPOINTS.length} serverů): ${errors.join("; ")}`);
}

// Tag filtr: buď jen klíč (existence), nebo klíč=hodnota.
export interface TagFilter {
  key: string;
  value?: string;
}

// Oblast hledání. Stačí jedno z:
//   relationId – OSM relation id administrativní oblasti (nejspolehlivější)
//   name       – jméno oblasti (resolvneme přes Nominatim)
//   bbox       – [jih, západ, sever, východ]
export interface AreaSpec {
  relationId?: number;
  name?: string;
  bbox?: [number, number, number, number];
}

export interface OverpassPlace {
  osmType: "node" | "way" | "relation";
  osmId: number;
  name: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  lat: number | null;
  lon: number | null;
  tags: Record<string, string>;
}

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

function escapeOverpassValue(v: string): string {
  // Overpass QL: hodnoty v uvozovkách, escapujeme " a \
  return v.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function tagFilterToQL(f: TagFilter): string {
  const key = `"${escapeOverpassValue(f.key)}"`;
  if (f.value === undefined || f.value === "") return `[${key}]`;
  return `[${key}="${escapeOverpassValue(f.value)}"]`;
}

// Resolvne jméno oblasti na Overpass area id (3600000000 + relation id),
// nebo na bbox, když relace neexistuje. Vrací null při neúspěchu.
export async function resolveArea(
  name: string,
): Promise<{ areaId?: number; bbox?: [number, number, number, number] }> {
  const url = `${NOMINATIM_ENDPOINT}?q=${encodeURIComponent(
    name,
  )}&format=jsonv2&limit=5&accept-language=cs`;
  const res = await fetchWithTimeout(url, { timeoutMs: 15000 });
  if (!res.ok) {
    throw new Error(`Nominatim vrátil ${res.status} pro oblast "${name}"`);
  }
  const results = (await res.json()) as Array<{
    osm_type?: string;
    osm_id?: number;
    boundingbox?: [string, string, string, string];
  }>;

  const relation = results.find((r) => r.osm_type === "relation" && r.osm_id);
  if (relation?.osm_id) {
    return { areaId: 3600000000 + relation.osm_id };
  }
  const first = results[0];
  if (first?.boundingbox) {
    const [s, n, w, e] = first.boundingbox.map(Number);
    return { bbox: [s, w, n, e] };
  }
  return {};
}

async function buildAreaClause(area: AreaSpec): Promise<{
  setup: string;
  ref: string;
}> {
  if (area.relationId) {
    const id = 3600000000 + area.relationId;
    return { setup: `area(${id})->.searchArea;`, ref: "(area.searchArea)" };
  }
  if (area.bbox) {
    const [s, w, n, e] = area.bbox;
    return { setup: "", ref: `(${s},${w},${n},${e})` };
  }
  if (area.name) {
    const resolved = await resolveArea(area.name);
    if (resolved.areaId) {
      return {
        setup: `area(${resolved.areaId})->.searchArea;`,
        ref: "(area.searchArea)",
      };
    }
    if (resolved.bbox) {
      const [s, w, n, e] = resolved.bbox;
      return { setup: "", ref: `(${s},${w},${n},${e})` };
    }
    throw new Error(`Oblast "${area.name}" se nepodařilo najít (Nominatim).`);
  }
  throw new Error("AreaSpec musí mít relationId, name nebo bbox.");
}

function pickTag(
  tags: Record<string, string>,
  keys: string[],
): string | null {
  for (const k of keys) {
    if (tags[k]) return tags[k];
  }
  return null;
}

// Tvar campaign.filters (jsonb) pro discovery přes OSM.
export interface DiscoveryFilters {
  tagFilters: TagFilter[];
  area: AreaSpec;
  limit?: number;
}

export interface SearchPlacesOptions {
  tagFilters: TagFilter[];
  area: AreaSpec;
  limit?: number;
  // jen POI s webem (default true) — bez webu je pro outreach nezajímáme
  requireWebsite?: boolean;
}

export async function searchPlaces({
  tagFilters,
  area,
  limit = 200,
  requireWebsite = true,
}: SearchPlacesOptions): Promise<OverpassPlace[]> {
  if (tagFilters.length === 0) {
    throw new Error("Aspoň jeden tagFilter je potřeba.");
  }
  const { setup, ref } = await buildAreaClause(area);

  // nwr = node|way|relation. `out tags center` vrátí tagy + souřadnice i pro
  // way/relation (přes center).
  const statements = tagFilters
    .map((f) => `  nwr${tagFilterToQL(f)}${ref};`)
    .join("\n");

  const ql = `[out:json][timeout:16];
${setup}
(
${statements}
);
out tags center ${limit};`;

  const res = await overpassRequest(ql);

  const json = (await res.json()) as { elements?: OverpassElement[] };
  const elements = json.elements ?? [];

  const places: OverpassPlace[] = elements.map((el) => {
    const tags = el.tags ?? {};
    const website = pickTag(tags, [
      "website",
      "contact:website",
      "url",
      "contact:url",
    ]);
    return {
      osmType: el.type,
      osmId: el.id,
      name: pickTag(tags, ["name", "official_name", "brand"]),
      website,
      phone: pickTag(tags, ["phone", "contact:phone", "contact:mobile"]),
      email: pickTag(tags, ["email", "contact:email"]),
      lat: el.lat ?? el.center?.lat ?? null,
      lon: el.lon ?? el.center?.lon ?? null,
      tags,
    };
  });

  return requireWebsite ? places.filter((p) => p.website) : places;
}
