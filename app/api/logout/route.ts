import { cookies } from "next/headers";

// POST /api/logout — smaže session cookie.
export async function POST() {
  const jar = await cookies();
  jar.delete("tak_session");
  return Response.json({ ok: true });
}
