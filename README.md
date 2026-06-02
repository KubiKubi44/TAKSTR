# Lead-gen & outreach nástroj

Interní nástroj na vyhledávání potenciálních klientů (firmy se slabým webem),
jejich analýzu a **poloautomatické** oslovování e-mailem. Ovládání z webu i
z mobilu přes Telegram bota.

> **Hlavní princip:** žádný e-mail neodejde bez explicitního schválení člověka.
> Skóruj levně, generuj draze. Každý mail má v patičce identifikaci odesílatele
> a opt-out. Měříme odpovědi, ne odeslané.

## Tech stack

- **Next.js 16** (App Router, TypeScript) — full-stack, Route Handlers pro API i Telegram webhook
- **TailwindCSS v4 + shadcn/ui** — dark-first, editorial styl
- **Drizzle ORM + PostgreSQL** hostovaný na Supabase (jen jako hostovaný Postgres — žádný Supabase JS klient/auth/storage)
- **@anthropic-ai/sdk** — generování draftů
- **cheerio** — parsování HTML
- **Resend** — odesílání e-mailů
- **Google Places API** — discovery
- **Telegram Bot API** — přes webhook

## Požadavky

- Node.js ≥ 20 (vyvíjeno na 22)
- Účet na Supabase (stačí free tier — bereme jen Postgres)
- API klíče: Anthropic, Resend, Google Places, (volitelně PageSpeed), Telegram bot token

## 1. Instalace

```bash
npm install
```

## 2. Nastavení databáze (Supabase)

1. Založ projekt na [supabase.com](https://supabase.com).
2. V dashboardu jdi na **Project → Connect** a zkopíruj dva connection stringy:
   - **Connection pooler** (port `6543`) → do `DATABASE_URL`
   - **Direct connection** (port `5432`) → do `DIRECT_URL`
3. Zkopíruj šablonu env a vyplň hodnoty:

```bash
cp .env.example .env
```

Vyplň alespoň `DATABASE_URL` a `DIRECT_URL`. Ostatní klíče doplníš podle toho,
kterou fázi zrovna testuješ (Places, Anthropic, Resend, Telegram).

> **Proč dva stringy?** Běžné dotazy jdou přes transaction pooler (6543), který
> škáluje spojení, ale neumí DDL/advisory locky. Migrace přes `drizzle-kit`
> proto musí jít přes direct connection (5432).

## 3. Migrace

> Schéma a migrace se přidávají od **Fáze 1**. Po Fázi 0 je `db/schema.ts`
> ještě prázdné, takže `generate` zatím nic nevytvoří.

```bash
npm run db:generate   # vygeneruje SQL migraci z db/schema.ts
npm run db:migrate    # aplikuje migrace na DB (přes DIRECT_URL)
npm run db:studio     # volitelně: Drizzle Studio nad DB
```

## 4. Seed (od Fáze 1)

```bash
npm run db:seed       # vloží jednoho app_user (tebe)
```

## 5. Vývojový server

```bash
npm run dev
```

App běží na <http://localhost:3000>.

## 6. Telegram webhook (od Fáze 7)

Telegram webhook potřebuje **veřejnou HTTPS adresu**. V lokálním vývoji použij
tunel (např. [ngrok](https://ngrok.com) nebo `cloudflared`):

```bash
ngrok http 3000
# vznikne např. https://abcd-12-34.ngrok-free.app
```

Webhook pak zaregistruješ na Telegram API (detailní skript přijde ve Fázi 7):

```bash
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -d "url=https://<tvuj-tunel>/api/telegram/webhook" \
  -d "secret_token=$TELEGRAM_WEBHOOK_SECRET"
```

Bot reaguje jen na `chat_id` z `TELEGRAM_ALLOWED_CHAT_ID` (whitelist).

## Struktura projektu

```
app/            # Next.js App Router (stránky + app/api Route Handlers)
components/      # React komponenty (components/ui = shadcn)
db/              # Drizzle: schema.ts, client.ts, migrace, seed
lib/             # places, triage, analyzer, claude, resend, telegram, utils
```

## Fáze stavby

Aplikace se staví fázovaně; po každé fázi commit + krátké shrnutí.

0. **Scaffold** — běžící prázdná appka, závislosti, napojení DB ← *hotovo*
1. Datový model (7 tabulek, enumy, relations, migrace, seed)
2. Discovery + triáž (Places API, levné skóre)
3. Hloubková analýza (cheerio, site_analysis)
4. Generování draftu (Claude API, verzování)
5. App UI (dark editorial)
6. Odesílání + tracking (Resend, metriky)
7. Telegram bot (webhook, schvalování z mobilu)
