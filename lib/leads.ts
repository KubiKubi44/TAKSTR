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

// Triáž jednoho leadu: levné skóre z úvodní stránky → uloží score,
// přepne na `scored` a zaloguje activity. Vrací výsledek triáže.
export async function scoreLead(input: {
  leadId: string;
  websiteUrl: string;
  fromStatus: LeadStatus;
  actor: ActivityActor;
}): Promise<TriageResult> {
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

  return result;
}
