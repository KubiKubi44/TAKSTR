// Spustí se jednou při startu serveru. Na Vercelu (Node runtime) občas
// selhává odchozí fetch na externí služby (Overpass apod.) kvůli IPv6 —
// „fetch failed". Vynutíme IPv4-first DNS, což to typicky vyřeší.
export async function register() {
  // Jen na Vercelu — tam padá IPv6. Lokálně (kde IPv6 funguje) nech default.
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.VERCEL) {
    const { setDefaultResultOrder } = await import("node:dns");
    try {
      setDefaultResultOrder("ipv4first");
    } catch {
      // některé prostředí to nepodporují — neblokuj start
    }
  }
}
