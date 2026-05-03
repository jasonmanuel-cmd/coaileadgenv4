import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const leads = sqliteTable("leads", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  guid: text("guid").unique().notNull(),
  title: text("title").notNull(),
  description: text("description"),
  url: text("url").notNull(),
  city: text("city").notNull(),
  cityLabel: text("city_label").notNull(),
  category: text("category").notNull(),
  keywords: text("keywords").notNull(), // JSON array of matched keywords
  postedAt: text("posted_at").notNull(),
  fetchedAt: text("fetched_at").notNull(),
  isRead: integer("is_read", { mode: "boolean" }).default(false),
  isSaved: integer("is_saved", { mode: "boolean" }).default(false),
  isContacted: integer("is_contacted", { mode: "boolean" }).default(false),
  score: integer("score").default(5),
});

export const insertLeadSchema = createInsertSchema(leads).omit({ id: true });
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leads.$inferSelect;

export const feedStats = sqliteTable("feed_stats", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  lastFetchedAt: text("last_fetched_at"),
  totalLeads: integer("total_leads").default(0),
  newLeads: integer("new_leads").default(0),
  citiesChecked: integer("cities_checked").default(0),
});
