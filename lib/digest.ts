import { and, asc, eq, gte, lt } from "drizzle-orm";
import { db } from "@/db/client";
import { calendarEvent, lead } from "@/db/schema";
import { getDueInvoices } from "@/db/queries";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
const czk = (n: number) => `${n.toLocaleString("cs-CZ")} Kč`;
const time = (d: Date) =>
  new Date(d).toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" });

// Sestaví denní souhrn (HTML pro Telegram): k fakturaci, dnešní události,
// drafty ke schválení.
export async function composeDigest(): Promise<string> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const [due, todayEvents, drafts] = await Promise.all([
    getDueInvoices(),
    db.query.calendarEvent.findMany({
      where: and(gte(calendarEvent.startAt, start), lt(calendarEvent.startAt, end)),
      with: {
        lead: { columns: { businessName: true } },
        project: { columns: { name: true } },
      },
      orderBy: [asc(calendarEvent.startAt)],
    }),
    db.query.lead.findMany({
      where: eq(lead.status, "drafted"),
      columns: { businessName: true },
    }),
  ]);

  const lines: string[] = [`<b>📋 Denní souhrn</b>`];

  lines.push("", `<b>🧾 K fakturaci (${due.length})</b>`);
  if (due.length === 0) lines.push("• nic");
  else
    for (const d of due.slice(0, 10))
      lines.push(`• ${esc(d.name)} — ${d.monthlyPrice ? czk(d.monthlyPrice) : ""}`);

  lines.push("", `<b>📅 Dnes (${todayEvents.length})</b>`);
  if (todayEvents.length === 0) lines.push("• nic");
  else
    for (const e of todayEvents) {
      const who = e.lead?.businessName ?? e.project?.name ?? "";
      lines.push(
        `• ${e.allDay ? "" : time(e.startAt) + " "}${esc(e.title)}${who ? ` — ${esc(who)}` : ""}`,
      );
    }

  lines.push("", `<b>✏️ Drafty ke schválení (${drafts.length})</b>`);
  if (drafts.length === 0) lines.push("• nic");
  else for (const l of drafts.slice(0, 10)) lines.push(`• ${esc(l.businessName)}`);

  if (due.length === 0 && todayEvents.length === 0 && drafts.length === 0) {
    return "<b>📋 Denní souhrn</b>\n\nDnes nic naléhavého. ☕";
  }

  return lines.join("\n");
}
