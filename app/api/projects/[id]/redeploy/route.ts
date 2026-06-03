import { getVercelProject, redeployProject } from "@/lib/vercel";

// POST /api/projects/:id/redeploy — spustí nový deploy Vercel projektu.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id.startsWith("prj_")) {
    return Response.json({ error: "Redeploy jde jen u Vercel projektů." }, { status: 400 });
  }

  let project;
  try {
    project = await getVercelProject(id);
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
  if (!project) return Response.json({ error: "Projekt nenalezen" }, { status: 404 });
  if (!project.redeployId) {
    return Response.json({ error: "Žádný předchozí deploy k zopakování." }, { status: 400 });
  }

  try {
    const r = await redeployProject(project.redeployId, project.name);
    return Response.json({ ok: true, ...r });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
}
