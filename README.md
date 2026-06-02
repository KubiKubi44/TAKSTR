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
2. V dashboardu jdi na **Project → Connect** a zkopíruj dva connection stringy
   (stejný pooler host, jen jiný port):
   - **Transaction pooler** (port `6543`) → do `DATABASE_URL`
   - **Session pooler** (port `5432`) → do `DIRECT_URL`

   > Heslo se speciálními znaky (`@`, `:`, …) percent-encoduj (`@` → `%40`).
   > „Direct connection" (`db.<ref>.supabase.co`) je IPv6-only a z IPv4 sítí se
   > nepřeloží — proto pro migrace bereme **session pooler** (5432), ne direct.
3. Zkopíruj šablonu env a vyplň hodnoty:

```bash
cp .env.example .env
```

Vyplň alespoň `DATABASE_URL` a `DIRECT_URL`. Ostatní klíče doplníš podle toho,
kterou fázi zrovna testuješ (Places, Anthropic, Resend, Telegram).

> **Proč dva stringy?** Běžné dotazy jdou přes transaction pooler (6543), který
> škáluje spojení, ale neumí DDL/advisory locky ani prepared statements. Migrace
> přes `drizzle-kit` proto jdou přes session pooler (5432).

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

## 6. Telegram bot (Fáze 7)

Bot je vzdálené ovládání — schvaluješ a odesílíš drafty z mobilu. Nemá vlastní
logiku, volá tytéž funkce jako web (`lib/pipeline.ts`).

**a) Založ bota** přes [@BotFather](https://t.me/BotFather) (`/newbot`) → dostaneš
`TELEGRAM_BOT_TOKEN`. Vymysli si náhodný `TELEGRAM_WEBHOOK_SECRET`. Obojí dej do `.env`.

**b) Zjisti svoje `chat_id`** — napiš svému botovi a otevři
`https://api.telegram.org/bot<TOKEN>/getUpdates`, nebo použij
[@userinfobot](https://t.me/userinfobot). Vlož ho do `.env` jako
`TELEGRAM_ALLOWED_CHAT_ID` a propiš do DB:

```bash
npm run db:seed   # seed nastaví app_user.telegram_chat_id z TELEGRAM_ALLOWED_CHAT_ID
```

> Bot reaguje **jen** na `chat_id`, které sedí na `app_user.telegram_chat_id`
> (whitelist — přes bota jdou reálná odeslání mailů).

**c) Veřejná HTTPS adresa** (webhook ji vyžaduje) — v dev použij tunel:

```bash
ngrok http 3000   # → např. https://abcd-12-34.ngrok-free.app
```

**d) Zaregistruj webhook:**

```bash
npm run telegram:webhook -- https://<tvuj-tunel>
```

**Použití bota:**
- Web vygeneruje draft → přijde ti do Telegramu zpráva s tlačítky
  **✅ Odeslat / ✏️ Upravit / ❌ Zahodit**.
- ✏️ → bot se zeptá „co upravit?", tvoje další zpráva = instrukce → nová verze.
- Pošleš-li botovi **URL**, založí z ní lead (`source = telegram`), zanalyzuje
  a vygeneruje draft (přeskočí triáž).

## Struktura projektu

```
app/            # Next.js App Router (stránky + app/api Route Handlers)
components/      # React komponenty (components/ui = shadcn)
db/              # Drizzle: schema.ts, client.ts, migrace, seed
lib/             # places, triage, analyzer, claude, resend, telegram, utils
```

## Fáze stavby

Aplikace se staví fázovaně; po každé fázi commit + krátké shrnutí.

0. ✅ Scaffold — běžící appka, závislosti, napojení DB
1. ✅ Datový model (7 tabulek, enumy, relations, migrace, seed)
2. ✅ Discovery + triáž (**OpenStreetMap / Overpass**, levné skóre)
3. ✅ Hloubková analýza (cheerio, site_analysis)
4. ✅ Generování draftu (Claude API, verzování)
5. ✅ App UI (glass / dark)
6. ✅ Odesílání + tracking (Resend, metriky)
7. ✅ Telegram bot (webhook, schvalování z mobilu)
