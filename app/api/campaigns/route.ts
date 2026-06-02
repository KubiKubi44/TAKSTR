import { db } from "@/db/client";
import { campaign } from "@/db/schema";

// POST /api/campaigns — založí kampaň (přiřadí prvnímu app_user).
// Tělo: { name, vertical, region, tagKey, tagValue?, areaName, limit? }
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    name?: string;
    vertical?: string;
    region?: string;
    tagKey?: string;
    tagValue?: string;
    areaName?: string;
    limit?: number;
  } | null;

  if (!body?.name || !body.vertical || !body.region || !body.tagKey || !body.areaName) {
    return Response.json(
      { error: "Vyplň název, vertikál, region, OSM tag (klíč) a oblast." },
      { status: 400 },
    );
  }

  const user = await db.query.appUser.findFirst();
  if (!user) {
    return Response.json(
      { error: "Žádný app_user — spusť npm run db:seed." },
      { status: 400 },
    );
  }

  const filters = {
    tagFilters: [
      { key: body.tagKey, ...(body.tagValue ? { value: body.tagValue } : {}) },
    ],
    area: { name: body.areaName },
    ...(body.limit ? { limit: body.limit } : {}),
  };

  const [row] = await db
    .insert(campaign)
    .values({
      userId: user.id,
      name: body.name,
      vertical: body.vertical,
      region: body.region,
      filters,
    })
    .returning({ id: campaign.id });

  return Response.json({ id: row.id });
}
