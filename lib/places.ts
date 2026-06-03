import { fetchWithTimeout } from "./http";

// Google Places API (New) — hodnocení a počet recenzí.
// VOLITELNÉ: bez GOOGLE_PLACES_API_KEY se přeskočí (vrátí null), nic se neúčtuje.
// Pozn.: Places má měsíční kredit zdarma; pro pár desítek leadů se do něj vejdeš.

const PLACES_SEARCH = "https://places.googleapis.com/v1/places:searchText";

export interface PlacesResult {
  rating: number | null; // 0–5
  reviews: number | null; // počet hodnocení
  placeId: string | null;
}

interface PlacesApiResponse {
  places?: Array<{
    id?: string;
    rating?: number;
    userRatingCount?: number;
    displayName?: { text?: string };
  }>;
}

export function placesEnabled(): boolean {
  return !!process.env.GOOGLE_PLACES_API_KEY;
}

// Vyhledá podnik a vrátí jeho hodnocení. Region zpřesní hledání.
export async function lookupRating(
  businessName: string,
  region?: string | null,
): Promise<PlacesResult | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return null; // funkce vypnutá → tiše přeskoč

  const query = region ? `${businessName} ${region}` : businessName;
  const res = await fetchWithTimeout(PLACES_SEARCH, {
    method: "POST",
    timeoutMs: 12000,
    headers: {
      "content-type": "application/json",
      "X-Goog-Api-Key": apiKey,
      // jen levná pole (Text Search Pro/Enterprise se účtuje dle masky)
      "X-Goog-FieldMask": "places.id,places.rating,places.userRatingCount,places.displayName",
    },
    body: JSON.stringify({ textQuery: query, languageCode: "cs", maxResultCount: 1 }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Google Places vrátil ${res.status}: ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as PlacesApiResponse;
  const top = json.places?.[0];
  if (!top) return null;

  return {
    rating: typeof top.rating === "number" ? top.rating : null,
    reviews: typeof top.userRatingCount === "number" ? top.userRatingCount : null,
    placeId: top.id ?? null,
  };
}
