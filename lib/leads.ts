import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  activity,
  lead,
  type ActivityActor,
  type ActivityType,
  type LeadStatus,
} from "@/db/schema";
import { triageWebsite, type TriageResult } from "./triage";
import { isSocialUrl } from "./url";

// Zapíše řádek do časové osy leadu.
export async function logActivity(input: {
  leadId: string;
  type: ActivityType;
  payload?: Record<string, unknown>;
  actor: ActivityActor;
}): Promise<void> {
  await db.insert(activity).values({
    leadId: input.leadId,
    type: input.type,
    payload: input.payload ?? {},
    actor: input.actor,
  });
}

// Změní stav leadu a ZÁROVEŇ založí activity (status_change).
// Stav appky i bota musí být synchronní a každá změna se loguje.
export async function updateLeadStatus(input: {
  leadId: string;
  status: LeadStatus;
  actor: ActivityActor;
  from?: LeadStatus;
  extra?: Record<string, unknown>;
}): Promise<void> {
  await db
    .update(lead)
    .set({ status: input.status })
    .where(eq(lead.id, input.leadId));

  await logActivity({
    leadId: input.leadId,
    type: "status_change",
    actor: input.actor,
    payload: { from: input.from ?? null, to: input.status, ...input.extra },
  });
}

// Výsledek triáže: buď oskórováno, nebo lead bez reálného webu
// (jen sociální síť), nebo web nedostupný — poslední dva se neskórují,
// jen označí příznakem k ručnímu posouzení.
export type ScoreOutcome =
  | { kind: "scored"; result: TriageResult }
  | { kind: "social" }
  | { kind: "unreachable"; error: string };

// Triáž jednoho leadu: levné skóre z úvodní stránky → uloží score,
// přepne na `scored` a zaloguje activity. Social/nedostupné jen oflagsuje.
export async function scoreLead(input: {
  leadId: string;
  websiteUrl: string;
  fromStatus: LeadStatus;
  actor: ActivityActor;
  flags?: Record<string, unknown>;
}): Promise<ScoreOutcome> {
  const existingFlags = input.flags ?? {};

  // jen sociální síť → nemá vlastní web, klasická triáž nedává smysl
  if (isSocialUrl(input.websiteUrl)) {
    await db
      .update(lead)
      .set({ flags: { ...existingFlags, socialOnly: true, noRealWebsite: true } })
      .where(eq(lead.id, input.leadId));
    await logActivity({
      leadId: input.leadId,
      type: "note",
      actor: input.actor,
      payload: {
        event: "triage_skipped",
        reason: "social_only",
        url: input.websiteUrl,
      },
    });
    return { kind: "social" };
  }

  try {
    const result = await triageWebsite(input.websiteUrl);
    await db
      .update(lead)
      .set({ score: result.score, status: "scored" })
      .where(eq(lead.id, input.leadId));
    await logActivity({
      leadId: input.leadId,
      type: "status_change",
      actor: input.actor,
      payload: {
        from: input.fromStatus,
        to: "scored",
        score: result.score,
        breakdown: result.breakdown,
        signals: result.signals,
      },
    });
    return { kind: "scored", result };
  } catch (err) {
    const message = (err as Error).message;
    // web nedostupný → příznak (ne skóre), zůstává discovered k ručnímu pohledu
    await db
      .update(lead)
      .set({
        flags: {
          ...existingFlags,
          websiteUnreachable: true,
          unreachableError: message,
        },
      })
      .where(eq(lead.id, input.leadId));
    await logActivity({
      leadId: input.leadId,
      type: "note",
      actor: input.actor,
      payload: { event: "triage_failed", reason: "unreachable", error: message },
    });
    return { kind: "unreachable", error: message };
  }
}
