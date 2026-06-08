import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { campaign, lead, type NewLead } from "@/db/schema";
import { logActivity } from "@/lib/leads";
import {
  searchPlaces,
  type DiscoveryFilters,
  type OverpassPlace,
} from "@/lib/overpass";
import { hostnameOf, isSocialUrl, normalizeWebsiteUrl } from "@/lib/url";

// Discovery sahá na externí Overpass (může chvíli trvat) — víc času na funkci.
export const maxDuration = 60;

// POST /api/campaigns/:id/discover
// Z campaign.filters zavolá Overpass, založí leady (discovered, source=osm),
// deduplikuje podle website_url v rámci kampaně.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const camp = await db.query.campaign.findFirst({
    where: eq(campaign.id, id),
  });
  if (!camp) {
    return Response.json({ error: "Kampaň nenalezena" }, { status: 404 });
  }

  const filters = camp.filters as Partial<DiscoveryFilters>;
  if (!filters?.tagFilters?.length || !filters?.area) {
    return Response.json(
      {
        error:
          "campaign.filters musí obsahovat tagFilters (neprázdné) a area. " +
          'Např. {"tagFilters":[{"key":"sport","value":"motocross"}],"area":{"name":"Kraj Vysočina"}}',
      },
      { status: 400 },
    );
  }

  let places: OverpassPlace[];
  try {
    places = await searchPlaces({
      tagFilters: filters.tagFilters,
      area: filters.area,
      limit: filters.limit ?? 200,
      requireWebsite: true,
    });
  } catch (err) {
    return Response.json(
      { error: `Discovery selhalo: ${(err as Error).message}` },
      { status: 502 },
    );
  }

  // dedup v rámci jedné dávky podle normalizované URL
  const placeByUrl = new Map<string, OverpassPlace>();
  const rows: NewLead[] = [];
  for (const p of places) {
    const url = normalizeWebsiteUrl(p.website!);
    if (!url || placeByUrl.has(url)) continue;
    placeByUrl.set(url, p);
    // „web" je jen sociální síť → lead bez vlastního webu (silný lead, jiný úhel)
    const social = isSocialUrl(url);
    rows.push({
      campaignId: camp.id,
      businessName: p.name ?? hostnameOf(url) ?? url,
      websiteUrl: url,
      contactEmail: p.email,
      phone: p.phone,
      source: "osm",
      status: "discovered",
      flags: social ? { socialOnly: true, noRealWebsite: true } : {},
    });
  }

  let inserted: { id: string; websiteUrl: string }[] = [];
  if (rows.length > 0) {
    inserted = await db
      .insert(lead)
      .values(rows)
      .onConflictDoNothing({
        target: [lead.campaignId, lead.websiteUrl],
      })
      .returning({ id: lead.id, websiteUrl: lead.websiteUrl });
  }

  // activity jen pro reálně vložené leady
  await Promise.all(
    inserted.map((l) =>
      logActivity({
        leadId: l.id,
        type: "note",
        actor: "app",
        payload: {
          event: "discovered",
          source: "osm",
          osmType: placeByUrl.get(l.websiteUrl)?.osmType,
          osmId: placeByUrl.get(l.websiteUrl)?.osmId,
        },
      }),
    ),
  );

  return Response.json({
    campaign: { id: camp.id, name: camp.name },
    overpassFound: places.length,
    withWebsiteUnique: rows.length,
    inserted: inserted.length,
    skippedDuplicates: rows.length - inserted.length,
  });
}
