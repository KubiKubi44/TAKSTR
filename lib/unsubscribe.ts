import { createHmac, timingSafeEqual } from "node:crypto";
import { normalizeEmail } from "./suppression";

// Bezstavový odhlašovací odkaz: token = HMAC(email, secret).
// Nepotřebuje DB ani expiraci — adresát klikne, ověříme podpis, zařadíme
// na suppression. Secret je sdílený s appkou (ne tajemství adresáta).

function secret(): string {
  const s =
    process.env.UNSUBSCRIBE_SECRET ||
    process.env.APP_SESSION_TOKEN ||
    process.env.CRON_SECRET;
  if (!s) {
    throw new Error(
      "Chybí secret pro odhlašovací odkaz (UNSUBSCRIBE_SECRET / APP_SESSION_TOKEN / CRON_SECRET).",
    );
  }
  return s;
}

// base64url bez paddingu — bezpečné do URL.
function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function makeUnsubToken(email: string): string {
  return b64url(createHmac("sha256", secret()).update(normalizeEmail(email)).digest());
}

export function verifyUnsubToken(email: string, token: string): boolean {
  if (!token) return false;
  const expected = makeUnsubToken(email);
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Základ veřejné URL appky (kvůli absolutním odkazům v e-mailu).
export function appBaseUrl(): string {
  const raw =
    process.env.APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "") ||
    "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

export function unsubscribeUrl(email: string): string {
  const e = encodeURIComponent(normalizeEmail(email));
  const t = makeUnsubToken(email);
  return `${appBaseUrl()}/api/unsubscribe?e=${e}&t=${t}`;
}
