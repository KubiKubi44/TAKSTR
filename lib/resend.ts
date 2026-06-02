import { Resend } from "resend";
import { parseSender } from "./claude";

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

// Patička: kdo píše + jak odmítnout. Nikdy negenerovat mail bez ní.
function optOutFooter(): string {
  const sender = parseSender(process.env.MAIL_FROM);
  return [
    "—",
    `Tento e-mail vám poslal ${sender.name} (${sender.email}).`,
    'Pokud si nepřejete další oslovení, stačí odpovědět „NE" a víc se neozveme.',
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

  const sender = parseSender(from);
  const text = `${body.trim()}\n\n${optOutFooter()}`;

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from,
    to,
    subject,
    text,
    replyTo: sender.email,
    headers: {
      // strojově čitelný opt-out (RFC 8058 / 2369)
      "List-Unsubscribe": `<mailto:${sender.email}?subject=unsubscribe>`,
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
