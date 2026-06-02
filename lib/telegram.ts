// Telegram Bot API přes webhook. Bot je jen vzdálené ovládání — volá tytéž
// backend funkce jako appka (viz lib/pipeline.ts).

export interface InlineKeyboard {
  inline_keyboard: Array<Array<{ text: string; callback_data: string }>>;
}

function apiUrl(method: string): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN není nastavený.");
  return `https://api.telegram.org/bot${token}/${method}`;
}

async function tg<T = unknown>(method: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(apiUrl(method), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { ok: boolean; result?: T; description?: string };
  if (!data.ok) {
    throw new Error(`Telegram ${method}: ${data.description ?? res.status}`);
  }
  return data.result as T;
}

export async function sendMessage(
  chatId: string | number,
  text: string,
  replyMarkup?: InlineKeyboard,
): Promise<{ message_id: number }> {
  return tg("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: replyMarkup,
  });
}

export async function editMessageReplyMarkup(
  chatId: string | number,
  messageId: number,
  replyMarkup: InlineKeyboard,
): Promise<unknown> {
  return tg("editMessageReplyMarkup", {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: replyMarkup,
  });
}

export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string,
): Promise<unknown> {
  return tg("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
  });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Inline klávesnice draftu: ✅ Odeslat / ✏️ Upravit / ❌ Zahodit.
export function draftKeyboard(draftId: string): InlineKeyboard {
  return {
    inline_keyboard: [
      [
        { text: "✅ Odeslat", callback_data: `send:${draftId}` },
        { text: "✏️ Upravit", callback_data: `edit:${draftId}` },
        { text: "❌ Zahodit", callback_data: `discard:${draftId}` },
      ],
    ],
  };
}

// Jedno tlačítko bez akce (po odeslání/zahození přepíšeme klávesnici).
export function singleButton(label: string): InlineKeyboard {
  return { inline_keyboard: [[{ text: label, callback_data: "noop" }]] };
}

export interface DraftMessage {
  leadId: string;
  draftId: string;
  businessName: string;
  version: number;
  subject: string;
  body: string;
  recipient: string | null;
}

export async function sendDraftMessage(
  chatId: string | number,
  d: DraftMessage,
): Promise<{ message_id: number }> {
  const text = [
    `<b>Nový draft v${d.version}</b> — ${escapeHtml(d.businessName)}`,
    `Komu: ${escapeHtml(d.recipient ?? "—")}`,
    "",
    `<b>${escapeHtml(d.subject)}</b>`,
    "",
    escapeHtml(d.body),
  ].join("\n");
  return sendMessage(chatId, text, draftKeyboard(d.draftId));
}
