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
}

interface RawDeployment {
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
}

function authHeaders(token: string) {
  return { authorization: `Bearer ${token}` };
}

function mapProject(p: RawProject, teamSlug: string): VercelProject {
  const deploys = p.latestDeployments ?? [];
  const prod = deploys.find((d) => d.target === "production") ?? deploys[0];
  const repo =
    p.link?.repo && p.link?.org ? `${p.link.org}/${p.link.repo}` : p.link?.repo ?? null;
  return {
    id: p.id,
    name: p.name,
    framework: p.framework ?? null,
    state: prod?.readyState ?? prod?.state ?? null,
    url: prod?.url ? `https://${prod.url}` : null,
    deployedAt: prod?.createdAt ?? null,
    repo,
    dashboardUrl: `https://vercel.com/${teamSlug}${p.name}`,
  };
}

function requireToken(): string {
  const token = process.env.VERCEL_TOKEN;
  if (!token) throw new Error("VERCEL_TOKEN není nastavený v .env.");
  return token;
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
  const teamSlug = team ? `${team}/` : "";
  return (data.projects ?? []).map((p) => mapProject(p, teamSlug));
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
  const base = mapProject(p, team ? `${team}/` : "");
  const deployments = (p.latestDeployments ?? []).slice(0, 6).map((d) => ({
    url: d.url ? `https://${d.url}` : null,
    state: d.readyState ?? d.state ?? null,
    createdAt: d.createdAt ?? null,
    target: d.target ?? null,
  }));
  return { ...base, deployments };
}
