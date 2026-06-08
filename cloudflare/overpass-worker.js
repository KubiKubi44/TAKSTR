// Cloudflare Worker — proxy na Overpass API.
//
// PROČ: Vercel funkce běží na AWS IP, které veřejné Overpass servery
// blokují/resetují („fetch failed") nebo jsou moc pomalé na limit funkce
// (→ 504). Cloudflare IP Overpass neblokuje a overpass-api.de přes něj
// odpovídá rychle, takže Vercel jen zavolá tenhle worker a dostane výsledek.
//
// NASAZENÍ (zdarma):
//   1. dash.cloudflare.com → Workers & Pages → Create → Worker
//   2. nahraď výchozí kód tímto, Deploy
//   3. Settings → Variables → přidej proměnnou `PROXY_SECRET` (náhodný řetězec)
//   4. zkopíruj URL workeru (např. https://overpass-proxy.tvuj-ucet.workers.dev)
//   5. na Vercel přidej:
//        OVERPASS_PROXY_URL    = ta URL
//        OVERPASS_PROXY_SECRET = stejný PROXY_SECRET
//      a Redeploy
//
// Worker přijme POST s tělem `data=<overpass QL>` (jako přímý Overpass),
// zkusí víc instancí a vrátí JSON.

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response("POST only", { status: 405 });
    }
    if (env.PROXY_SECRET && request.headers.get("x-proxy-secret") !== env.PROXY_SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await request.text(); // "data=<ql>"
    const errors = [];
    for (const ep of ENDPOINTS) {
      try {
        const r = await fetch(ep, {
          method: "POST",
          headers: {
            "content-type": "application/x-www-form-urlencoded",
            // DŮLEŽITÉ: bez User-Agenta vrací overpass-api.de 406 Not Acceptable
            "user-agent": "leadgen-overpass-proxy/1.0 (kontakt: bartusek.tom@gmail.com)",
          },
          body,
        });
        if (r.ok) {
          return new Response(r.body, {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
        errors.push(`${ep} → ${r.status}`);
      } catch (e) {
        errors.push(`${ep} → ${e.message}`);
      }
    }
    return new Response(JSON.stringify({ error: "Overpass unavailable", detail: errors.join("; ") }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  },
};
