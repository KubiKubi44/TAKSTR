import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { pushSubscription } from "@/db/schema";

// POST /api/push/unsubscribe — smaže odběr podle endpointu.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { endpoint?: string } | null;
  if (body?.endpoint) {
    await db.delete(pushSubscription).where(eq(pushSubscription.endpoint, body.endpoint));
  }
  return Response.json({ ok: true });
}
