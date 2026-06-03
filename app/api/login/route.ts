import { cookies } from "next/headers";

// POST /api/login — ověří heslo a nastaví session cookie.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { password?: string } | null;
  const expected = process.env.APP_PASSWORD;
  if (!expected) {
    return Response.json({ error: "Login není nastavený." }, { status: 400 });
  }
  if (body?.password !== expected) {
    return Response.json({ error: "Špatné heslo." }, { status: 401 });
  }

  const jar = await cookies();
  jar.set("tak_session", process.env.APP_SESSION_TOKEN ?? "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return Response.json({ ok: true });
}
