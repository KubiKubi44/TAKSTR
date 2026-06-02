import "dotenv/config";
import postgres from "postgres";

// Rychlé ověření, že se appka připojí k Supabase Postgresu přes pooler.
// Spusť: npm run db:check  (po vyplnění DATABASE_URL v .env)
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("✗ DATABASE_URL není nastavená. Zkopíruj .env.example → .env a vyplň.");
    process.exit(1);
  }

  const sql = postgres(url, { prepare: false, max: 1 });
  try {
    const [row] = await sql`select version() as version, now() as now`;
    console.log("✓ Připojeno k Postgresu přes pooler.");
    console.log("  ", row.version);
    console.log("   čas serveru:", row.now);
  } catch (err) {
    console.error("✗ Připojení selhalo:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
}

main();
