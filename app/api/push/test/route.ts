import { sendPush } from "@/lib/push";

// POST /api/push/test — pošle testovací notifikaci na všechna zařízení.
export async function POST() {
  const r = await sendPush({
    title: "TAK",
    body: "Testovací oznámení ✅ Funguje to!",
    url: "/",
  });
  return Response.json(r);
}
