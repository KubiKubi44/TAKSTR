import tls from "node:tls";
import { fetchWithTimeout } from "./http";

// Detekce „umírajícího" webu, kterou neudělá samotný fetch HTML:
// platnost SSL certifikátu (TLS handshake) a expirace domény (RDAP).
// Obojí zdarma, bez klíče. Best-effort — chyba se promítne jako null.

// Registrovatelná doména z hostu (ořízne subdomény). Pokrývá běžné případy
// včetně víceúrovňových TLD typu co.uk; pro .cz vrací „firma.cz".
const MULTI_SLD = new Set(["co", "com", "net", "org", "gov", "edu", "ac"]);
export function registrableDomain(host: string): string {
  const parts = host.replace(/^www\./, "").split(".");
  if (parts.length <= 2) return parts.join(".");
  const sld = parts[parts.length - 2];
  const take = MULTI_SLD.has(sld) && parts[parts.length - 1].length <= 3 ? 3 : 2;
  return parts.slice(-take).join(".");
}

export interface TlsResult {
  valid: boolean; // důvěryhodný řetězec a ne po expiraci
  daysLeft: number | null; // do expirace certifikátu
  validTo: string | null;
  error?: string;
}

// TLS handshake na :443 — přečte certifikát i když je neplatný
// (rejectUnauthorized:false), validitu pak vyhodnotíme sami.
export function checkTls(host: string, timeoutMs = 8000): Promise<TlsResult> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (r: TlsResult) => {
      if (!done) {
        done = true;
        resolve(r);
      }
    };
    try {
      const socket = tls.connect(
        { host, port: 443, servername: host, rejectUnauthorized: false, timeout: timeoutMs },
        () => {
          const cert = socket.getPeerCertificate();
          const authorized = socket.authorized;
          const validTo = cert?.valid_to ? new Date(cert.valid_to) : null;
          const daysLeft = validTo
            ? Math.round((validTo.getTime() - Date.now()) / 86400000)
            : null;
          socket.end();
          finish({
            valid: authorized && (daysLeft == null || daysLeft >= 0),
            daysLeft,
            validTo: validTo ? validTo.toISOString() : null,
          });
        },
      );
      socket.on("error", (e) =>
        finish({ valid: false, daysLeft: null, validTo: null, error: e.message }),
      );
      socket.on("timeout", () => {
        socket.destroy();
        finish({ valid: false, daysLeft: null, validTo: null, error: "timeout" });
      });
    } catch (e) {
      finish({ valid: false, daysLeft: null, validTo: null, error: (e as Error).message });
    }
  });
}

export interface DomainResult {
  expiresAt: string | null;
  daysLeft: number | null;
}

// Expirace domény přes RDAP (rdap.org bootstrapuje na správný registr,
// pro .cz na rdap.nic.cz). Vrací null, když registr RDAP nepodporuje.
export async function checkDomainExpiry(domain: string): Promise<DomainResult | null> {
  try {
    const res = await fetchWithTimeout(`https://rdap.org/domain/${domain}`, {
      timeoutMs: 10000,
      headers: { accept: "application/rdap+json" },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      events?: Array<{ eventAction?: string; eventDate?: string }>;
    };
    const ev = (json.events ?? []).find((e) => e.eventAction === "expiration");
    if (!ev?.eventDate) return null;
    const d = new Date(ev.eventDate);
    if (Number.isNaN(d.getTime())) return null;
    return {
      expiresAt: d.toISOString(),
      daysLeft: Math.round((d.getTime() - Date.now()) / 86400000),
    };
  } catch {
    return null;
  }
}
