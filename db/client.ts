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
    // Pool přes Supabase pooler. Klient cacheujeme na globalThis (níže), takže
    // hot-reloady nevyrábí nové pooly. max=10 dává prostor pro souběžné dotazy
    // (víc načtených stránek najednou) bez vyčerpání spojení / čekání ve frontě.
    max: 10,
    idle_timeout: 20, // s — zavři nečinné spojení
    max_lifetime: 60 * 30, // s — recykluj spojení po 30 min
    connect_timeout: 15, // s
    // tvrdý strop na délku dotazu — radši rychlá chyba než 40s viset
    connection: { statement_timeout: 20000 },
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__pgClient = client;
}

export const db = drizzle(client, { schema });
export { schema };
