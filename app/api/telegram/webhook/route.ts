import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { emailDraft, telegramState } from "@/db/schema";
import {
  analyzeLead,
  createLeadFromUrl,
  discardDraft,
  findUserByChatId,
  generateDraftForLead,
  PipelineError,
  sendLeadDraft,
} from "@/lib/pipeline";
import {
  answerCallbackQuery,
  editMessageReplyMarkup,
  sendMessage,
  singleButton,
} from "@/lib/telegram";
import { composeDigest } from "@/lib/digest";

// Minimal tvary Telegram update, co používáme.
interface TgChat { id: number }
interface TgMessage { message_id: number; chat: TgChat; text?: string }
interface TgCallbackQuery { id: string; data?: string; message?: TgMessage }
interface TgUpdate { message?: TgMessage; callback_query?: TgCallbackQuery }

const ACTOR = "telegram" as const;

function nowHHMM(): string {
  return new Date().toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" });
}

async function getDraftLead(draftId: string): Promise<string | null> {
  const d = await db.query.emailDraft.findFirst({ where: eq(emailDraft.id, draftId) });
  return d?.leadId ?? null;
}

async function setEditState(chatId: number, leadId: string, draftId: string) {
  await db
    .insert(telegramState)
    .values({ chatId: String(chatId), mode: "await_edit", leadId, draftId })
    .onConflictDoUpdate({
      target: telegramState.chatId,
      set: { mode: "await_edit", leadId, draftId, updatedAt: new Date() },
    });
}

async function clearState(chatId: number) {
  await db.delete(telegramState).where(eq(telegramState.chatId, String(chatId)));
}

// ── Callback (✅ / ✏️ / ❌) ──────────────────────────────────
async function handleCallback(cq: TgCallbackQuery) {
  const chatId = cq.message?.chat.id;
  const messageId = cq.message?.message_id;
  if (chatId === undefined || messageId === undefined) return;

  if (!(await findUserByChatId(chatId))) return; // whitelist

  const [action, draftId] = (cq.data ?? "").split(":");
  if (!draftId && action !== "noop") {
    await answerCallbackQuery(cq.id);
    return;
  }

  try {
    if (action === "send") {
      const leadId = await getDraftLead(draftId);
      if (!leadId) throw new PipelineError("Draft nenalezen", 404);
      const res = await sendLeadDraft(leadId, ACTOR);
      await editMessageReplyMarkup(chatId, messageId, singleButton(`✅ Odesláno ${nowHHMM()}`));
      await answerCallbackQuery(cq.id, `Odesláno na ${res.to}`);
    } else if (action === "edit") {
      const leadId = await getDraftLead(draftId);
      if (!leadId) throw new PipelineError("Draft nenalezen", 404);
      await setEditState(chatId, leadId, draftId);
      await sendMessage(chatId, "✏️ Co upravit? Napiš instrukci a vyrobím novou verzi.");
      await answerCallbackQuery(cq.id);
    } else if (action === "discard") {
      await discardDraft(draftId, ACTOR);
      await editMessageReplyMarkup(chatId, messageId, singleButton("❌ Zahozeno"));
      await answerCallbackQuery(cq.id, "Zahozeno");
    } else {
      await answerCallbackQuery(cq.id);
    }
  } catch (err) {
    const msg = err instanceof PipelineError ? err.message : "Něco se nepovedlo.";
    await answerCallbackQuery(cq.id, msg.slice(0, 190));
    await sendMessage(chatId, `⚠️ ${msg}`);
  }
}

// ── Zpráva (instrukce k úpravě / URL / help) ─────────────────
async function handleMessage(msg: TgMessage) {
  const chatId = msg.chat.id;
  const text = (msg.text ?? "").trim();
  if (!text) return;

  if (!(await findUserByChatId(chatId))) return; // whitelist

  // /digest → pošle denní souhrn na vyžádání
  if (text === "/digest" || text === "/souhrn") {
    await sendMessage(chatId, await composeDigest());
    return;
  }

  // čekáme na instrukci k úpravě?
  const state = await db.query.telegramState.findFirst({
    where: eq(telegramState.chatId, String(chatId)),
  });
  if (state?.mode === "await_edit" && state.leadId) {
    await clearState(chatId);
    await sendMessage(chatId, "✏️ Vyrábím novou verzi…");
    try {
      await generateDraftForLead(state.leadId, { editInstruction: text, actor: ACTOR });
      // nový draft přijde jako notifikace s tlačítky
    } catch (err) {
      await sendMessage(chatId, `⚠️ ${err instanceof PipelineError ? err.message : "Chyba při generování."}`);
    }
    return;
  }

  // URL → ruční lead → analýza → draft (přeskočí triáž)
  const isUrl = /^\S+$/.test(text) && /\.[a-z]{2,}/i.test(text);
  if (isUrl) {
    try {
      const lead = await createLeadFromUrl(text, ACTOR, "telegram");
      await sendMessage(chatId, `🔎 Zakládám lead a analyzuji ${lead.websiteUrl}…`);
      await analyzeLead(lead.id, ACTOR);
      await generateDraftForLead(lead.id, { actor: ACTOR });
      // draft přijde jako notifikace s tlačítky
    } catch (err) {
      await sendMessage(chatId, `⚠️ ${err instanceof PipelineError ? err.message : "Chyba."}`);
    }
    return;
  }

  await sendMessage(
    chatId,
    "Pošli mi URL webu a založím z něj lead (analýza + draft). " +
      "U draftů používej tlačítka ✅ Odeslat / ✏️ Upravit / ❌ Zahodit.",
  );
}

// ── Webhook ──────────────────────────────────────────────────
export async function POST(req: Request) {
  // ověření tajného tokenu od Telegramu
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) {
    return Response.json({ error: "Webhook secret není nastavený." }, { status: 503 });
  }
  if (req.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let update: TgUpdate;
  try {
    update = (await req.json()) as TgUpdate;
  } catch {
    return Response.json({ ok: true });
  }

  try {
    if (update.callback_query) await handleCallback(update.callback_query);
    else if (update.message) await handleMessage(update.message);
  } catch (err) {
    // nikdy nevracíme ne-200, ať Telegram neretryuje donekonečna
    console.error("Telegram webhook error:", err);
  }

  return Response.json({ ok: true });
}
