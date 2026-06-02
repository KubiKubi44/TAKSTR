// Seed: vloží jednoho app_user (mě). Idempotentní (přes unikátní email).
// Spusť: npm run db:seed
//
// `dotenv/config` musí být PRVNÍ import — db/client.ts čte DATABASE_URL
// při vyhodnocení modulu, takže env musí být načtené dřív.
import "dotenv/config";
import { db } from "./client";
import { appUser } from "./schema";

const SEED_USER = {
  name: process.env.SEED_USER_NAME ?? "Tom Bartůšek",
  email: process.env.SEED_USER_EMAIL ?? "bartusek.tom@gmail.com",
  // placeholder dokud nepřijde reálné chat_id z Telegramu (Fáze 7)
  telegramChatId: process.env.TELEGRAM_ALLOWED_CHAT_ID || null,
};

async function main() {
  await db
    .insert(appUser)
    .values(SEED_USER)
    .onConflictDoNothing({ target: appUser.email });

  const users = await db.query.appUser.findMany();
  console.log(`✓ Seed hotový. app_user v DB: ${users.length}`);
  for (const u of users) {
    console.log(
      `   - ${u.name} <${u.email}>  telegram_chat_id=${u.telegramChatId ?? "—"}  id=${u.id}`,
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("✗ Seed selhal:", err);
    process.exit(1);
  });
