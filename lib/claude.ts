import Anthropic from "@anthropic-ai/sdk";

// Model v konstantě (z env, default sonnet). Drafty pouštíme draze jen na
// ručně vybrané leady — princip "skóruj levně, generuj draze".
export const CLAUDE_MODEL = process.env.CLAUDE_MODEL ?? "claude-sonnet-4-6";

const SYSTEM_PROMPT = `Jsi copywriter malého českého webového studia, které oslovuje majitele
zastaralých nebo nedostatečných webů s nabídkou předělání.

Pravidla:
- Píšeš česky, lidsky, NE jako klasický cold-mailing.
- Hodnota stojí na KONKRÉTNÍCH, ne-generických pozorováních o tomhle webu.
  Zakázané fráze typu "váš web je zastaralý" bez důkazu. Vždy uveď, CO přesně
  a PROČ to vadí právě jejich byznysu/publiku.
- Najdi max. 3 nejsilnější důvody k předělání, opřené o poskytnuté signály.
- Mail je krátký, bez vychloubání, končí nízkotlakou výzvou (nezávazně probrat).
- Pokud web obsahuje signál o ukončení činnosti, změň úhel na zachování/archiv.
- Do patičky vždy přidej identifikaci odesílatele a větu o možnosti odmítnout
  další oslovení.

Vrať POUZE validní JSON, bez markdown bloků:
{"subject": "...", "body": "...", "recipient_email": "...|null", "notes": "..."}`;

export interface DraftAnalysis {
  builder: string | null;
  mobileOk: boolean;
  hasEn: boolean;
  pagespeed: number | null;
  langs?: string[];
  signals?: Record<string, unknown>;
  textExcerpt: string | null;
}

export interface DraftSender {
  name: string;
  email: string;
}

export interface GenerateDraftInput {
  businessName: string;
  websiteUrl: string;
  contactEmail: string | null;
  analysis: DraftAnalysis;
  sender: DraftSender;
  editInstruction?: string;
  prior?: { subject: string; body: string; version: number };
}

export interface DraftOutput {
  subject: string;
  body: string;
  recipientEmail: string | null;
  notes: string | null;
}

// Z "Jméno <mail@domena.cz>" vytáhne jméno a e-mail pro patičku.
export function parseSender(mailFrom: string | undefined): DraftSender {
  if (!mailFrom) return { name: "(doplň MAIL_FROM)", email: "" };
  const m = mailFrom.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1].replace(/^"|"$/g, "") || m[2], email: m[2] };
  return { name: mailFrom, email: mailFrom };
}

function buildUserMessage(input: GenerateDraftInput): string {
  const a = input.analysis;
  const parts: string[] = [
    `Firma: ${input.businessName}`,
    `Web: ${input.websiteUrl}`,
    `Kontaktní e-mail: ${input.contactEmail ?? "neznámý"}`,
    "",
    "Signály z analýzy webu:",
    `- Builder/engine: ${a.builder ?? "neznámý"}`,
    `- Mobilní verze (viewport): ${a.mobileOk ? "ano" : "NE"}`,
    `- Cizojazyčná verze: ${a.hasEn ? "ano (en)" : a.langs?.length ? a.langs.join(", ") : "ne"}`,
    `- PageSpeed (mobil): ${a.pagespeed ?? "neměřeno"}`,
  ];
  if (a.signals && Object.keys(a.signals).length) {
    parts.push(`- Další signály: ${JSON.stringify(a.signals)}`);
  }
  parts.push(
    "",
    "Úryvek textu z webu:",
    a.textExcerpt ? a.textExcerpt.slice(0, 6000) : "(text se nepodařilo získat)",
    "",
    `Odesílatel pro patičku: ${input.sender.name} <${input.sender.email}>`,
  );

  if (input.editInstruction && input.prior) {
    parts.push(
      "",
      `PŮVODNÍ DRAFT (verze ${input.prior.version}):`,
      `Předmět: ${input.prior.subject}`,
      "Tělo:",
      input.prior.body,
      "",
      "POŽADOVANÁ ÚPRAVA OD UŽIVATELE:",
      input.editInstruction,
      "",
      "Uprav draft podle pokynu, zachovej výše uvedená pravidla.",
    );
  }

  return parts.join("\n");
}

// Robustní vytažení JSON i z ```json ... ``` bloků nebo okolního textu.
function parseJsonLoose(text: string): unknown {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  try {
    return JSON.parse(t);
  } catch {
    const first = t.indexOf("{");
    const last = t.lastIndexOf("}");
    if (first !== -1 && last > first) {
      return JSON.parse(t.slice(first, last + 1));
    }
    throw new Error("Model nevrátil parsovatelný JSON.");
  }
}

export async function generateDraft(
  input: GenerateDraftInput,
): Promise<DraftOutput> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY není nastavený. Vytvoř klíč na console.anthropic.com a vlož do .env.",
    );
  }

  const client = new Anthropic({ apiKey });
  const msg = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserMessage(input) }],
  });

  const text = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  const parsed = parseJsonLoose(text) as {
    subject?: string;
    body?: string;
    recipient_email?: string | null;
    notes?: string | null;
  };

  if (!parsed.subject || !parsed.body) {
    throw new Error("Model nevrátil subject/body.");
  }

  return {
    subject: parsed.subject,
    body: parsed.body,
    // když model nevyplní příjemce, doplní se výš z lead.contact_email
    recipientEmail: parsed.recipient_email ?? input.contactEmail ?? null,
    notes: parsed.notes ?? null,
  };
}
