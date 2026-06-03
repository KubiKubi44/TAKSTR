// Přehled projektů z Vercelu přes REST API (read-only token).
// Token vytvoříš na vercel.com/account/tokens → VERCEL_TOKEN v .env.
// Pokud jsou projekty pod týmem, přidej i VERCEL_TEAM_ID.

const BASE = "https://api.vercel.com";

export interface VercelProject {
  id: string;
  name: string;
  framework: string | null;
  state: string | null; // READY | ERROR | BUILDING | QUEUED | CANCELED | null
  url: string | null; // produkční URL posledního deploye
  deployedAt: number | null; // ms timestamp
  repo: string | null;
  dashboardUrl: string;
  analyticsUrl: string;
}

interface RawDeployment {
  uid?: string;
  id?: string;
  readyState?: string;
  state?: string;
  url?: string;
  createdAt?: number;
  target?: string;
}
interface RawProject {
  id: string;
  name: string;
  framework?: string | null;
  accountId?: string;
  latestDeployments?: RawDeployment[];
  link?: { type?: string; org?: string; repo?: string };
}

export interface VercelDeployment {
  url: string | null;
  state: string | null;
  createdAt: number | null;
  target: string | null;
}

export interface VercelProjectDetail extends VercelProject {
  deployments: VercelDeployment[];
  domains: { name: string; verified: boolean }[];
  redeployId: string | null;
}

function authHeaders(token: string) {
  return { authorization: `Bearer ${token}` };
}

function mapProject(p: RawProject, slug: string): VercelProject {
  const deploys = p.latestDeployments ?? [];
  const prod = deploys.find((d) => d.target === "production") ?? deploys[0];
  const repo =
    p.link?.repo && p.link?.org ? `${p.link.org}/${p.link.repo}` : p.link?.repo ?? null;
  const dashboardUrl = `https://vercel.com/${slug}/${p.name}`;
  return {
    id: p.id,
    name: p.name,
    framework: p.framework ?? null,
    state: prod?.readyState ?? prod?.state ?? null,
    url: prod?.url ? `https://${prod.url}` : null,
    deployedAt: prod?.createdAt ?? null,
    repo,
    dashboardUrl,
    analyticsUrl: `${dashboardUrl}/analytics`,
  };
}

function requireToken(): string {
  const token = process.env.VERCEL_TOKEN;
  if (!token) throw new Error("VERCEL_TOKEN není nastavený v .env.");
  return token;
}

// Owner slug (username u osobního účtu / slug týmu) — pro správné odkazy.
let cachedSlug: string | null = null;
async function getOwnerSlug(token: string): Promise<string> {
  if (cachedSlug !== null) return cachedSlug;
  const team = process.env.VERCEL_TEAM_ID;
  try {
    if (team) {
      const r = await fetch(`${BASE}/v2/teams/${team}`, { headers: authHeaders(token) });
      const d = (await r.json()) as { slug?: string };
      cachedSlug = d.slug ?? team;
    } else {
      const r = await fetch(`${BASE}/v2/user`, { headers: authHeaders(token) });
      const d = (await r.json()) as { user?: { username?: string } };
      cachedSlug = d.user?.username ?? "";
    }
  } catch {
    cachedSlug = team ?? "";
  }
  return cachedSlug;
}

export async function listVercelProjects(): Promise<VercelProject[]> {
  const token = requireToken();
  const team = process.env.VERCEL_TEAM_ID;
  const q = new URLSearchParams({ limit: "100" });
  if (team) q.set("teamId", team);

  const res = await fetch(`${BASE}/v9/projects?${q.toString()}`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Vercel API ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as { projects?: RawProject[] };
  const slug = await getOwnerSlug(token);
  return (data.projects ?? []).map((p) => mapProject(p, slug));
}

export async function getVercelProject(
  idOrName: string,
): Promise<VercelProjectDetail | null> {
  const token = requireToken();
  const team = process.env.VERCEL_TEAM_ID;
  const q = team ? `?teamId=${team}` : "";

  const res = await fetch(`${BASE}/v9/projects/${idOrName}${q}`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Vercel API ${res.status}: ${body.slice(0, 200)}`);
  }

  const p = (await res.json()) as RawProject;
  const slug = await getOwnerSlug(token);
  const base = mapProject(p, slug);
  const deployments = (p.latestDeployments ?? []).slice(0, 6).map((d) => ({
    url: d.url ? `https://${d.url}` : null,
    state: d.readyState ?? d.state ?? null,
    createdAt: d.createdAt ?? null,
    target: d.target ?? null,
  }));
  const firstDeploy = p.latestDeployments?.[0];
  const redeployId = firstDeploy?.uid ?? firstDeploy?.id ?? null;

  // domény projektu (best-effort)
  let domains: { name: string; verified: boolean }[] = [];
  try {
    const domRes = await fetch(`${BASE}/v9/projects/${idOrName}/domains${q}`, {
      headers: authHeaders(token),
      cache: "no-store",
    });
    if (domRes.ok) {
      const dd = (await domRes.json()) as { domains?: { name: string; verified?: boolean }[] };
      domains = (dd.domains ?? []).map((d) => ({ name: d.name, verified: !!d.verified }));
    }
  } catch {
    // ignore
  }

  return { ...base, deployments, domains, redeployId };
}

// Spustí nový (re)deploy projektu z posledního deploye.
export async function redeployProject(
  deploymentId: string,
  name: string,
): Promise<{ id: string; url: string | null }> {
  const token = requireToken();
  const team = process.env.VERCEL_TEAM_ID;
  const q = team ? `?teamId=${team}` : "";
  const res = await fetch(`${BASE}/v13/deployments${q}`, {
    method: "POST",
    headers: { ...authHeaders(token), "content-type": "application/json" },
    body: JSON.stringify({ name, deploymentId, target: "production" }),
  });
  const d = (await res.json()) as { id?: string; url?: string; error?: { message?: string } };
  if (!res.ok) {
    throw new Error(`Vercel redeploy ${res.status}: ${d.error?.message ?? "chyba"}`);
  }
  return { id: d.id ?? "", url: d.url ? `https://${d.url}` : null };
}
