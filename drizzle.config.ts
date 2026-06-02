import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// Migrace běží přes direct connection (port 5432), NE přes pooler.
// drizzle-kit potřebuje session-mode spojení (DDL, advisory locks),
// které transaction pooler na 6543 neumí.
const url = process.env.DIRECT_URL;

if (!url) {
  throw new Error(
    "DIRECT_URL není nastavená. Vyplň direct connection string z Supabase (port 5432) v .env.",
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dbCredentials: { url },
  casing: "snake_case",
  verbose: true,
  strict: true,
});
