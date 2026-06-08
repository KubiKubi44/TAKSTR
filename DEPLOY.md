# Nasazení na Vercel

Appka je připravená na Vercel (Next.js 16). Tohle je checklist, ať to běží
naostro — hlavně **cron** (denní digest, monitor poptávek, follow-upy),
**Telegram bot** a **webhooky**, které lokálně reálně nejedou.

## 1. Repo na GitHub
```bash
git push   # na main (Vercel se napojí na repo)
```

## 2. Import do Vercelu
- vercel.com → **Add New… → Project** → vyber repo.
- Framework se detekuje jako **Next.js**, build command i output nech default.
- **Před prvním deployem nastav Environment Variables** (níže).

## 3. Environment Variables (Project → Settings → Environment Variables)
Zkopíruj z lokálního `.env`. **Povinné pro běh:**

| Proměnná | K čemu |
|---|---|
| `DATABASE_URL` | DB (Supabase **transaction pooler**, port 6543) |
| `APP_PASSWORD` | heslo do appky |
| `APP_SESSION_TOKEN` | token session cookie (náhodný hex) |
| `CRON_SECRET` | ochrana cronů — **Vercel ho sám pošle** v `Authorization` hlavičce cron requestů |

**Pro plný provoz (doplň co používáš):**
| Proměnná | K čemu |
|---|---|
| `ANTHROPIC_API_KEY` | generování draftů + follow-upy (jinak „spí") |
| `CLAUDE_MODEL` | `claude-sonnet-4-6` |
| `RESEND_API_KEY`, `MAIL_FROM` | odesílání e-mailů |
| `RESEND_WEBHOOK_SECRET` | tracking doručení (viz krok 5) |
| `APP_URL` | **veřejná URL appky** (kvůli odhlašovacím odkazům) — viz krok 4 |
| `UNSUBSCRIBE_SECRET` | volitelně (jinak fallback na APP_SESSION_TOKEN/CRON_SECRET) |
| `GOOGLE_PLACES_API_KEY` | hodnocení leadů (volitelné) |
| `PAGESPEED_API_KEY` | PageSpeed (volitelné) |
| `VERCEL_TOKEN`, `VERCEL_TEAM_ID` | přehled projektů na stránce Projekty |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_ALLOWED_CHAT_ID` | bot |

> `DIRECT_URL` (port 5432) je jen pro **migrace** (drizzle-kit), za běhu není
> potřeba. Migrace se aplikují zvlášť (lokálně / přes Supabase), ne při deployi.

## 4. Po prvním deployi
- Vezmi produkční doménu (např. `https://tak.vercel.app` nebo vlastní).
- Nastav `APP_URL` = ta doména (Settings → Env → Redeploy).

## 5. Webhooky (nastav na produkční URL)
- **Resend**: Dashboard → Webhooks → Add → `https://<doména>/api/resend/webhook`,
  zkopíruj `whsec_…` do `RESEND_WEBHOOK_SECRET`. Zapni Open/Click tracking na doméně.
- **Telegram**: nastav webhook na `https://<doména>/api/telegram/webhook`
  (lokální skript `npm run telegram:webhook` používá tunel; pro prod stačí jednou
  zavolat `setWebhook` s prod URL a stejným secretem).

## 6. Cron (běží automaticky po nasazení)
Vercel **Hobby (free) plán** umí cron **jen 1× denně**, proto je vše sloučené
do jednoho denního cronu (`vercel.json`):
- `0 7 * * *` → `/api/cron/daily` = digest + monitor poptávek + follow-upy.

Endpoint ověřuje `CRON_SECRET` (Vercel ho posílá automaticky).
Ručně/častěji jdou spustit z appky kdykoliv (Poptávky → „Obnovit teď",
Obchod → „Follow-upy"). Na **Pro** plánu jde cron rozdělit a spouštět častěji.

## Pozn. k DB stabilitě
Pool je `max: 10` + `statement_timeout: 20s` (db/client.ts). Na Vercelu jsou
funkce krátkožijící a Supabase pooler to zvládá; lokální „zaseknutí" po dlouhém
dev běhu se na produkci neprojevuje.
