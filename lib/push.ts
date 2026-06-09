import webpush from "web-push";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { pushSubscription } from "@/db/schema";

// Web Push notifikace do PWA (telefon). VAPID klíče v env.

let configured = false;
function configure(): boolean {
  if (configured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@example.com";
  if (!pub || !priv) return false;
  webpush.setVapidDetails(subject, pub, priv);
  configured = true;
  return true;
}

export function pushReady(): boolean {
  return configure();
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string; // kam appku otevřít po kliknutí
}

// Pošle notifikaci na všechny uložené odběry. Zaniklé (404/410) smaže.
export async function sendPush(payload: PushPayload): Promise<{ sent: number; removed: number }> {
  if (!configure()) return { sent: 0, removed: 0 };
  const subs = await db.select().from(pushSubscription);
  const data = JSON.stringify(payload);
  let sent = 0;
  let removed = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        data,
      );
      sent++;
    } catch (err) {
      const code = (err as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) {
        await db.delete(pushSubscription).where(eq(pushSubscription.endpoint, s.endpoint));
        removed++;
      }
    }
  }
  return { sent, removed };
}
