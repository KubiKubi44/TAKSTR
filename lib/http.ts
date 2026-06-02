// Slušný User-Agent — Overpass i Nominatim ho v usage policy vyžadují,
// a weby leadů reagují líp na identifikovaný request než na holý fetch.
export const USER_AGENT =
  "leadgen-tool/0.1 (poloautomatický outreach; kontakt: bartusek.tom@gmail.com)";

export interface FetchOptions extends RequestInit {
  timeoutMs?: number;
}

// fetch s tvrdým timeoutem (AbortController) a default User-Agentem.
export async function fetchWithTimeout(
  url: string,
  { timeoutMs = 15000, headers, ...init }: FetchOptions = {},
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      redirect: "follow",
      ...init,
      signal: controller.signal,
      headers: {
        "user-agent": USER_AGENT,
        ...headers,
      },
    });
  } finally {
    clearTimeout(timer);
  }
}
