import { Resend } from "resend";
import { parseSender } from "./claude";
import { isSuppressed } from "./suppression";
import { unsubscribeUrl } from "./unsubscribe";

// Odesílání e-mailů přes Resend z ověřené domény.
// Ke každému mailu se VŽDY připojí opt-out patička — identifikace odesílatele
// a možnost odmítnout další oslovení (§7 zák. 480/2004 Sb. + GDPR).

export interface SendEmailInput {
  to: string;
  subject: string;
  body: string;
}

export interface SendEmailResult {
  providerId: string;
}

// Vyhozeno, když je příjemce na suppression listu — odeslání se NESMÍ provést.
export class SuppressedRecipientError extends Error {
  constructor(public email: string) {
    super(`Příjemce ${email} je na seznamu odhlášených — neodesílám.`);
    this.name = "SuppressedRecipientError";
  }
}

// Patička: kdo píše + jak odmítnout. Nikdy negenerovat mail bez ní.
// Obsahuje klikací odhlašovací odkaz (jednoklik), ne jen „odpověz NE".
function optOutFooter(to: string): string {
  const sender = parseSender(process.env.MAIL_FROM);
  return [
    "—",
    `Tento e-mail vám poslal ${sender.name} (${sender.email}).`,
    `Pokud si nepřejete další oslovení, odhlaste se zde: ${unsubscribeUrl(to)}`,
    'Nebo stačí odpovědět „NE" a víc se neozveme.',
  ].join("\n");
}

export async function sendEmail({
  to,
  subject,
  body,
}: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY není nastavený v .env.");
  }
  const from = process.env.MAIL_FROM;
  if (!from) {
    throw new Error("MAIL_FROM není nastavený v .env.");
  }

  // tvrdá pojistka: na odhlášené nikdy neposíláme (i kdyby to volající opomněl)
  if (await isSuppressed(to)) {
    throw new SuppressedRecipientError(to);
  }

  const sender = parseSender(from);
  const text = `${body.trim()}\n\n${optOutFooter(to)}`;
  const unsubUrl = unsubscribeUrl(to);

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from,
    to,
    subject,
    text,
    replyTo: sender.email,
    headers: {
      // strojově čitelný opt-out (RFC 8058 / 2369) — jednoklik přes HTTPS i mailto
      "List-Unsubscribe": `<${unsubUrl}>, <mailto:${sender.email}?subject=unsubscribe>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });

  if (error) {
    throw new Error(error.message ?? "Resend vrátil chybu.");
  }
  if (!data?.id) {
    throw new Error("Resend nevrátil id zprávy.");
  }
  return { providerId: data.id };
}
