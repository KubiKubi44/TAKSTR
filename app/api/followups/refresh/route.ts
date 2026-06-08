import { runFollowups } from "@/lib/pipeline";

// POST /api/followups/refresh — ruční spuštění follow-upů z appky (za auth).
export async function POST(req: Request) {
  const days = Number(new URL(req.url).searchParams.get("days")) || 5;
  const result = await runFollowups(days);
  return Response.json(result);
}
