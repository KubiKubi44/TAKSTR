import { pollDemand } from "@/lib/demand";

// POST /api/demand/refresh — ruční obnovení poptávek z appky (za auth).
export async function POST() {
  const result = await pollDemand();
  return Response.json(result);
}
