import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Běžné dotazy jdou přes Supabase connection pooler (port 6543).
// Pooler běží v transaction módu (pgbouncer), proto `prepare: false` —
// prepared statements tam nejsou podporované.
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL není nastavená. Zkopíruj .env.example do .env a vyplň connection string z Supabase (pooler, port 6543).",
  );
}

// V dev módu Next.js hot-reload jinak otevírá nové spojení při každém reloadu.
// Cacheujeme klienta na globálním objektu.
const globalForDb = globalThis as unknown as {
  __pgClient?: ReturnType<typeof postgres>;
};

const client =
  globalForDb.__pgClient ??
  postgres(connectionString, {
    prepare: false,
    // Pooler má vlastní limity; držíme malý pool na straně aplikace.
    max: 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__pgClient = client;
}

export const db = drizzle(client, { schema });
export { schema };
