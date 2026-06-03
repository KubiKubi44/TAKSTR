import { checkHealth } from "@/lib/health";

// GET /api/health?url=<encoded> — pingne web a vrátí stav.
export async function GET(req: Request) {
  const url = new URL(req.url).searchParams.get("url");
  if (!url || !/^https?:\/\//i.test(url)) {
    return Response.json({ error: "Chybí/neplatná url" }, { status: 400 });
  }
  const result = await checkHealth(url);
  return Response.json(result);
}
