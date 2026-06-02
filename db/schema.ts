import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

// ─────────────────────────────────────────────────────────────
// Enumy (Postgres pgEnum, ne volné stringy)
// ─────────────────────────────────────────────────────────────

// `osm` = automatické discovery přes OpenStreetMap / Overpass
// (původně se počítalo s Google Places, ale přešli jsme na OSM — bez klíče/karty).
export const leadSourceEnum = pgEnum("lead_source", [
  "osm",
  "manual",
  "telegram",
]);

// Stavový automat:
// discovered → scored → analyzed → drafted → sent → replied → meeting → won
//                                                           ↘ dead (kdykoliv)
export const leadStatusEnum = pgEnum("lead_status", [
  "discovered",
  "scored",
  "analyzed",
  "drafted",
  "sent",
  "replied",
  "meeting",
  "won",
  "dead",
]);

export const draftStatusEnum = pgEnum("draft_status", [
  "draft",
  "approved",
  "sent",
  "discarded",
]);

export const outreachDirectionEnum = pgEnum("outreach_direction", [
  "outbound",
  "inbound",
]);

export const activityTypeEnum = pgEnum("activity_type", [
  "status_change",
  "note",
  "email_sent",
  "reply",
  "call",
]);

export const activityActorEnum = pgEnum("activity_actor", [
  "app",
  "telegram",
  "system",
]);

export const campaignStatusEnum = pgEnum("campaign_status", [
  "active",
  "paused",
  "done",
]);

// ─────────────────────────────────────────────────────────────
// Tabulky
// ─────────────────────────────────────────────────────────────

// app_user — whitelist pro bota; zatím jeden uživatel (já).
export const appUser = pgTable("app_user", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  telegramChatId: text("telegram_chat_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

// campaign — jeden vertikál/běh. Nese metriky po segmentu.
export const campaign = pgTable("campaign", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => appUser.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  vertical: text("vertical").notNull(),
  region: text("region").notNull(),
  filters: jsonb("filters")
    .$type<Record<string, unknown>>()
    .default({})
    .notNull(),
  status: campaignStatusEnum("status").default("active").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

// lead — jádro modelu.
export const lead = pgTable(
  "lead",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaign.id, { onDelete: "cascade" }),
    businessName: text("business_name").notNull(),
    websiteUrl: text("website_url").notNull(),
    contactEmail: text("contact_email"),
    phone: text("phone"),
    source: leadSourceEnum("source").notNull(),
    // ruční leady (manual/telegram) skóre nemají → nullable
    score: integer("score"),
    status: leadStatusEnum("status").default("discovered").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    // dedup discovery: jeden web jen jednou v rámci kampaně
    unique("lead_campaign_website_uq").on(t.campaignId, t.websiteUrl),
  ],
);

// site_analysis — výstup analyzéru, 1:N k leadu (re-analýza = nový řádek).
export const siteAnalysis = pgTable("site_analysis", {
  id: uuid("id").primaryKey().defaultRandom(),
  leadId: uuid("lead_id")
    .notNull()
    .references(() => lead.id, { onDelete: "cascade" }),
  builder: text("builder"),
  mobileOk: boolean("mobile_ok").notNull(),
  hasEn: boolean("has_en").notNull(),
  pagespeed: integer("pagespeed"),
  // cokoliv navíc bez změny schématu (jazyky, rok v patičce, https, …)
  signals: jsonb("signals").$type<Record<string, unknown>>().default({}).notNull(),
  textExcerpt: text("text_excerpt"),
  analyzedAt: timestamp("analyzed_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// email_draft — verzované drafty, 1:N k leadu.
export const emailDraft = pgTable("email_draft", {
  id: uuid("id").primaryKey().defaultRandom(),
  leadId: uuid("lead_id")
    .notNull()
    .references(() => lead.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  recipientEmail: text("recipient_email"),
  model: text("model").notNull(),
  // instrukce, kterou tahle verze vznikla (null u v1)
  editInstruction: text("edit_instruction"),
  status: draftStatusEnum("status").default("draft").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

// outreach — odeslání i odpovědi v jedné tabulce. Z ní se počítají metriky.
export const outreach = pgTable("outreach", {
  id: uuid("id").primaryKey().defaultRandom(),
  leadId: uuid("lead_id")
    .notNull()
    .references(() => lead.id, { onDelete: "cascade" }),
  draftId: uuid("draft_id").references(() => emailDraft.id, {
    onDelete: "set null",
  }),
  direction: outreachDirectionEnum("direction").notNull(),
  toAddr: text("to_addr").notNull(),
  // id z Resendu (outbound); inbound nemá
  providerId: text("provider_id"),
  status: text("status"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  repliedAt: timestamp("replied_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

// activity — časová osa leadu (audit). Append-only.
export const activity = pgTable("activity", {
  id: uuid("id").primaryKey().defaultRandom(),
  leadId: uuid("lead_id")
    .notNull()
    .references(() => lead.id, { onDelete: "cascade" }),
  type: activityTypeEnum("type").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().default({}).notNull(),
  actor: activityActorEnum("actor").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ─────────────────────────────────────────────────────────────
// Relations — aby šel lead načíst se všemi vazbami jedním dotazem
// ─────────────────────────────────────────────────────────────

export const appUserRelations = relations(appUser, ({ many }) => ({
  campaigns: many(campaign),
}));

export const campaignRelations = relations(campaign, ({ one, many }) => ({
  user: one(appUser, {
    fields: [campaign.userId],
    references: [appUser.id],
  }),
  leads: many(lead),
}));

export const leadRelations = relations(lead, ({ one, many }) => ({
  campaign: one(campaign, {
    fields: [lead.campaignId],
    references: [campaign.id],
  }),
  analyses: many(siteAnalysis),
  drafts: many(emailDraft),
  outreach: many(outreach),
  activities: many(activity),
}));

export const siteAnalysisRelations = relations(siteAnalysis, ({ one }) => ({
  lead: one(lead, {
    fields: [siteAnalysis.leadId],
    references: [lead.id],
  }),
}));

export const emailDraftRelations = relations(emailDraft, ({ one, many }) => ({
  lead: one(lead, {
    fields: [emailDraft.leadId],
    references: [lead.id],
  }),
  outreach: many(outreach),
}));

export const outreachRelations = relations(outreach, ({ one }) => ({
  lead: one(lead, {
    fields: [outreach.leadId],
    references: [lead.id],
  }),
  draft: one(emailDraft, {
    fields: [outreach.draftId],
    references: [emailDraft.id],
  }),
}));

export const activityRelations = relations(activity, ({ one }) => ({
  lead: one(lead, {
    fields: [activity.leadId],
    references: [lead.id],
  }),
}));

// ─────────────────────────────────────────────────────────────
// Typy (odvozené ze schématu)
// ─────────────────────────────────────────────────────────────

export type AppUser = typeof appUser.$inferSelect;
export type NewAppUser = typeof appUser.$inferInsert;
export type Campaign = typeof campaign.$inferSelect;
export type NewCampaign = typeof campaign.$inferInsert;
export type Lead = typeof lead.$inferSelect;
export type NewLead = typeof lead.$inferInsert;
export type SiteAnalysis = typeof siteAnalysis.$inferSelect;
export type NewSiteAnalysis = typeof siteAnalysis.$inferInsert;
export type EmailDraft = typeof emailDraft.$inferSelect;
export type NewEmailDraft = typeof emailDraft.$inferInsert;
export type Outreach = typeof outreach.$inferSelect;
export type NewOutreach = typeof outreach.$inferInsert;
export type Activity = typeof activity.$inferSelect;
export type NewActivity = typeof activity.$inferInsert;

// Union typy z enumů (např. "discovered" | "scored" | …)
export type LeadSource = (typeof leadSourceEnum.enumValues)[number];
export type LeadStatus = (typeof leadStatusEnum.enumValues)[number];
export type DraftStatus = (typeof draftStatusEnum.enumValues)[number];
export type OutreachDirection = (typeof outreachDirectionEnum.enumValues)[number];
export type ActivityType = (typeof activityTypeEnum.enumValues)[number];
export type ActivityActor = (typeof activityActorEnum.enumValues)[number];
export type CampaignStatus = (typeof campaignStatusEnum.enumValues)[number];
