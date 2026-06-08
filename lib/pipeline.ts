import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  appUser,
  campaign,
  emailDraft,
  lead,
  outreach,
  siteAnalysis,
  type ActivityActor,
  type LeadSource,
} from "@/db/schema";
import { getLeadWithRelations } from "@/db/queries";
import { analyzeWebsite } from "@/lib/analyzer";
import { lookupAres } from "@/lib/ares";
import { lookupRating, placesEnabled } from "@/lib/places";
import { CLAUDE_MODEL, generateDraft, parseSender } from "@/lib/claude";
import { logActivity, updateLeadStatus } from "@/lib/leads";
import { sendEmail, SuppressedRecipientError } from "@/lib/resend";
import { sendDraftMessage } from "@/lib/telegram";
import { hostnameOf, normalizeWebsiteUrl } from "@/lib/url";

// Chyba s HTTP statusem — route handlery ji namapují na Response.
export class PipelineError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const INBOX_CAMPAIGN_NAME = "Ruční / Telegram";

// ── Hloubková analýza ────────────────────────────────────────
export async function analyzeLead(leadId: string, actor: ActivityActor) {
  const row = await db.query.lead.findFirst({ where: eq(lead.id, leadId) });
  if (!row) throw new PipelineError("Lead nenalezen", 404);

  let result;
  try {
    result = await analyzeWebsite(row.websiteUrl);
  } catch (err) {
    const message = (err as Error).message;
    await db
      .update(lead)
      .set({ flags: { ...row.flags, websiteUnreachable: true, unreachableError: message } })
      .where(eq(lead.id, row.id));
    await logActivity({
      leadId: row.id,
      type: "note",
      actor,
      payload: { event: "analyze_failed", reason: "unreachable", error: message },
    });
    throw new PipelineError(`Analýza selhala (web nedostupný): ${message}`, 502);
  }

  const [analysis] = await db
    .insert(siteAnalysis)
    .values({
      leadId: row.id,
      builder: result.builder,
      mobileOk: result.mobileOk,
      hasEn: result.hasEn,
      pagespeed: result.pagespeed,
      signals: result.signals as unknown as Record<string, unknown>,
      textExcerpt: result.textExcerpt,
    })
    .returning({ id: siteAnalysis.id, analyzedAt: siteAnalysis.analyzedAt });

  let contactEmailSet = false;
  if (result.contactEmail && !row.contactEmail) {
    await db.update(lead).set({ contactEmail: result.contactEmail }).where(eq(lead.id, row.id));
    contactEmailSet = true;
  }

  // příznaky „umírajícího" webu → lead.flags (vstup pro skóre příležitosti)
  if (Object.keys(result.flags).length > 0) {
    await db
      .update(lead)
      .set({ flags: { ...row.flags, ...result.flags } })
      .where(eq(lead.id, row.id));
  }

  await updateLeadStatus({
    leadId: row.id,
    status: "analyzed",
    from: row.status,
    actor,
    extra: {
      analysisId: analysis.id,
      builder: result.builder,
      mobileOk: result.mobileOk,
      hasEn: result.hasEn,
      pagespeed: result.pagespeed,
      contactEmail: result.contactEmail,
    },
  });

  return {
    analysisId: analysis.id,
    analyzedAt: analysis.analyzedAt,
    builder: result.builder,
    mobileOk: result.mobileOk,
    hasEn: result.hasEn,
    pagespeed: result.pagespeed,
    contactEmail: result.contactEmail,
    contactEmailSavedToLead: contactEmailSet,
    textExcerptLength: result.textExcerpt.length,
  };
}

// ── Obohacení leadu (ARES + Google hodnocení) ────────────────
export async function enrichLead(leadId: string, actor: ActivityActor) {
  const row = await db.query.lead.findFirst({
    where: eq(lead.id, leadId),
    with: { campaign: true },
  });
  if (!row) throw new PipelineError("Lead nenalezen", 404);

  // ARES a Google běží paralelně; chyba jednoho nesmí shodit druhé
  const region = row.campaign?.region ?? null;
  const [aresRes, ratingRes] = await Promise.allSettled([
    lookupAres(row.businessName),
    lookupRating(row.businessName, region),
  ]);

  const ares = aresRes.status === "fulfilled" ? aresRes.value : null;
  const rating = ratingRes.status === "fulfilled" ? ratingRes.value : null;

  if (!ares && !rating) {
    const errs = [
      aresRes.status === "rejected" ? `ARES: ${aresRes.reason}` : null,
      ratingRes.status === "rejected" ? `Google: ${ratingRes.reason}` : null,
    ].filter(Boolean);
    throw new PipelineError(
      errs.length ? errs.join(" · ") : "Nic se nenašlo (ARES ani hodnocení).",
      502,
    );
  }

  // nová firma (vznik < 18 měsíců) — potřebuje první pořádný web
  const foundedAt = ares?.foundedAt ? new Date(ares.foundedAt) : null;
  const newFirm = !!(
    foundedAt && Date.now() - foundedAt.getTime() < 18 * 30 * 86400000
  );

  const enrichment: Record<string, unknown> = {
    ...row.enrichment,
    ...(ares
      ? {
          ico: ares.ico,
          aresName: ares.name,
          legalForm: ares.legalForm,
          foundedAt: ares.foundedAt,
          address: ares.address,
          nace: ares.nace,
          newFirm,
        }
      : {}),
    ...(rating
      ? { rating: rating.rating, reviews: rating.reviews, placeId: rating.placeId }
      : {}),
    enrichedAt: new Date().toISOString(),
    placesChecked: placesEnabled(),
  };

  await db.update(lead).set({ enrichment }).where(eq(lead.id, row.id));
  await logActivity({
    leadId: row.id,
    type: "note",
    actor,
    payload: {
      event: "enriched",
      ico: ares?.ico ?? null,
      rating: rating?.rating ?? null,
      reviews: rating?.reviews ?? null,
    },
  });

  return {
    ares,
    rating,
    placesEnabled: placesEnabled(),
  };
}

// ── Generování draftu (s notifikací do Telegramu) ────────────
export async function generateDraftForLead(
  leadId: string,
  opts: { editInstruction?: string; actor: ActivityActor },
) {
  const leadRow = await getLeadWithRelations(leadId);
  if (!leadRow) throw new PipelineError("Lead nenalezen", 404);

  const analysis = leadRow.analyses[0];
  if (!analysis) {
    throw new PipelineError("Lead nemá analýzu. Nejdřív spusť analýzu.", 400);
  }

  const latest = leadRow.drafts.at(-1);
  const version = (latest?.version ?? 0) + 1;
  const prior =
    opts.editInstruction && latest
      ? { subject: latest.subject, body: latest.body, version: latest.version }
      : undefined;
  const langs = Array.isArray(analysis.signals.langs)
    ? (analysis.signals.langs as string[])
    : undefined;

  let output;
  try {
    output = await generateDraft({
      businessName: leadRow.businessName,
      websiteUrl: leadRow.websiteUrl,
      contactEmail: leadRow.contactEmail,
      analysis: {
        builder: analysis.builder,
        mobileOk: analysis.mobileOk,
        hasEn: analysis.hasEn,
        pagespeed: analysis.pagespeed,
        langs,
        signals: analysis.signals,
        textExcerpt: analysis.textExcerpt,
      },
      sender: parseSender(process.env.MAIL_FROM),
      editInstruction: opts.editInstruction,
      prior,
    });
  } catch (err) {
    const message = (err as Error).message;
    throw new PipelineError(
      `Generování draftu selhalo: ${message}`,
      message.includes("ANTHROPIC_API_KEY") ? 503 : 502,
    );
  }

  const [draft] = await db
    .insert(emailDraft)
    .values({
      leadId: leadRow.id,
      version,
      subject: output.subject,
      body: output.body,
      recipientEmail: output.recipientEmail,
      model: CLAUDE_MODEL,
      editInstruction: opts.editInstruction ?? null,
      status: "draft",
    })
    .returning();

  await updateLeadStatus({
    leadId: leadRow.id,
    status: "drafted",
    from: leadRow.status,
    actor: opts.actor,
    extra: { draftId: draft.id, version, editInstruction: opts.editInstruction ?? null },
  });

  // notifikace do Telegramu (best-effort — nesmí shodit generování)
  await notifyNewDraft(leadRow.id).catch(() => {});

  return { draft, notes: output.notes };
}

// ── Odeslání draftu přes Resend ──────────────────────────────
export async function sendLeadDraft(leadId: string, actor: ActivityActor) {
  const leadRow = await getLeadWithRelations(leadId);
  if (!leadRow) throw new PipelineError("Lead nenalezen", 404);

  const draft = leadRow.drafts.at(-1);
  if (!draft) throw new PipelineError("Lead nemá žádný draft.", 400);
  if (draft.status !== "approved" && draft.status !== "draft") {
    throw new PipelineError(
      `Draft je ve stavu „${draft.status}" — odeslat lze jen schválený/rozpracovaný.`,
      400,
    );
  }

  const recipient = draft.recipientEmail ?? leadRow.contactEmail;
  if (!recipient) {
    throw new PipelineError("Chybí příjemce (recipient_email ani contact_email).", 400);
  }

  let providerId: string;
  try {
    providerId = (
      await sendEmail({ to: recipient, subject: draft.subject, body: draft.body })
    ).providerId;
  } catch (err) {
    if (err instanceof SuppressedRecipientError) {
      throw new PipelineError(err.message, 409);
    }
    const message = (err as Error).message;
    const status = message.includes("RESEND_API_KEY") || message.includes("MAIL_FROM") ? 503 : 502;
    throw new PipelineError(`Odeslání selhalo: ${message}`, status);
  }

  await db.insert(outreach).values({
    leadId: leadRow.id,
    draftId: draft.id,
    direction: "outbound",
    toAddr: recipient,
    providerId,
    status: "sent",
    sentAt: new Date(),
  });
  await db.update(emailDraft).set({ status: "sent" }).where(eq(emailDraft.id, draft.id));
  await db
    .update(lead)
    .set({ contactEmail: leadRow.contactEmail ?? recipient })
    .where(eq(lead.id, leadRow.id));
  await logActivity({
    leadId: leadRow.id,
    type: "email_sent",
    actor,
    payload: { draftId: draft.id, version: draft.version, to: recipient, providerId },
  });
  await updateLeadStatus({
    leadId: leadRow.id,
    status: "sent",
    from: leadRow.status,
    actor,
  });

  return { providerId, to: recipient, draftVersion: draft.version };
}

// ── Označit odpovězeno (inbound) ─────────────────────────────
export async function markReplied(leadId: string, actor: ActivityActor) {
  const row = await db.query.lead.findFirst({ where: eq(lead.id, leadId) });
  if (!row) throw new PipelineError("Lead nenalezen", 404);

  const now = new Date();
  const lastOutbound = await db.query.outreach.findFirst({
    where: and(eq(outreach.leadId, leadId), eq(outreach.direction, "outbound")),
    orderBy: [desc(outreach.sentAt)],
  });

  await db.insert(outreach).values({
    leadId,
    draftId: lastOutbound?.draftId ?? null,
    direction: "inbound",
    toAddr: parseSender(process.env.MAIL_FROM).email || "—",
    status: "replied",
    repliedAt: now,
  });
  if (lastOutbound) {
    await db.update(outreach).set({ repliedAt: now }).where(eq(outreach.id, lastOutbound.id));
  }
  await logActivity({ leadId, type: "reply", actor, payload: {} });
  await updateLeadStatus({ leadId, status: "replied", from: row.status, actor });
}

// ── Zahodit draft (❌) ───────────────────────────────────────
export async function discardDraft(draftId: string, actor: ActivityActor) {
  const draft = await db.query.emailDraft.findFirst({ where: eq(emailDraft.id, draftId) });
  if (!draft) throw new PipelineError("Draft nenalezen", 404);
  await db.update(emailDraft).set({ status: "discarded" }).where(eq(emailDraft.id, draftId));
  await logActivity({
    leadId: draft.leadId,
    type: "note",
    actor,
    payload: { event: "draft_discarded", draftId, version: draft.version },
  });
  return draft;
}

// ── Ruční lead z URL (Telegram příkaz) ───────────────────────
async function getOrCreateInboxCampaign(userId: string) {
  const existing = await db.query.campaign.findFirst({
    where: and(eq(campaign.userId, userId), eq(campaign.name, INBOX_CAMPAIGN_NAME)),
  });
  if (existing) return existing;
  const [c] = await db
    .insert(campaign)
    .values({ userId, name: INBOX_CAMPAIGN_NAME, vertical: "ruční", region: "—", filters: {} })
    .returning();
  return c;
}

export async function createLeadFromUrl(
  url: string,
  actor: ActivityActor,
  source: LeadSource = "telegram",
) {
  const norm = normalizeWebsiteUrl(url);
  if (!norm) throw new PipelineError("Neplatná URL", 400);

  const user = await db.query.appUser.findFirst();
  if (!user) throw new PipelineError("Žádný app_user (spusť seed).", 400);

  const camp = await getOrCreateInboxCampaign(user.id);

  const [inserted] = await db
    .insert(lead)
    .values({
      campaignId: camp.id,
      businessName: hostnameOf(norm) ?? norm,
      websiteUrl: norm,
      source,
      status: "discovered",
    })
    .onConflictDoNothing({ target: [lead.campaignId, lead.websiteUrl] })
    .returning();

  if (inserted) {
    await logActivity({
      leadId: inserted.id,
      type: "note",
      actor,
      payload: { event: "manual_added", source, url: norm },
    });
    return inserted;
  }

  const existing = await db.query.lead.findFirst({
    where: and(eq(lead.campaignId, camp.id), eq(lead.websiteUrl, norm)),
  });
  if (!existing) throw new PipelineError("Lead se nepodařilo založit.", 500);
  return existing;
}

// ── Notifikace do Telegramu po vzniku draftu ─────────────────
async function notifyNewDraft(leadId: string): Promise<void> {
  if (!process.env.TELEGRAM_BOT_TOKEN) return;
  const user = await db.query.appUser.findFirst();
  const chatId = user?.telegramChatId;
  if (!chatId) return;

  const leadRow = await getLeadWithRelations(leadId);
  const draft = leadRow?.drafts.at(-1);
  if (!leadRow || !draft) return;

  await sendDraftMessage(chatId, {
    leadId: leadRow.id,
    draftId: draft.id,
    businessName: leadRow.businessName,
    version: draft.version,
    subject: draft.subject,
    body: draft.body,
    recipient: draft.recipientEmail ?? leadRow.contactEmail,
  });
}

// Najde app_user podle telegram chat_id (whitelist pro bota).
export async function findUserByChatId(chatId: string | number) {
  return db.query.appUser.findFirst({
    where: eq(appUser.telegramChatId, String(chatId)),
  });
}
