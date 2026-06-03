import { fetchWithTimeout } from "./http";

export interface HealthResult {
  ok: boolean;
  status: number | null;
  ms: number | null;
  error?: string;
}

// Pingne URL a vrátí, jestli web žije (+ HTTP status a dobu odezvy).
export async function checkHealth(url: string): Promise<HealthResult> {
  const start = Date.now();
  try {
    const res = await fetchWithTimeout(url, {
      method: "GET",
      timeoutMs: 8000,
      headers: { accept: "text/html,*/*" },
    });
    return { ok: res.ok, status: res.status, ms: Date.now() - start };
  } catch (err) {
    return { ok: false, status: null, ms: null, error: (err as Error).message };
  }
}
