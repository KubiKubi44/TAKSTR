import { db } from "@/db/client";
import { pushSubscription } from "@/db/schema";

// POST /api/push/subscribe — uloží odběr push notifikací (jedno zařízení).
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  } | null;
  if (!body?.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return Response.json({ error: "Neplatný odběr." }, { status: 400 });
  }
  await db
    .insert(pushSubscription)
    .values({ endpoint: body.endpoint, p256dh: body.keys.p256dh, auth: body.keys.auth })
    .onConflictDoNothing({ target: pushSubscription.endpoint });
  return Response.json({ ok: true });
}
