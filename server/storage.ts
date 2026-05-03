import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { leads, feedStats, type Lead, type InsertLead } from "@shared/schema";
import { eq, desc, and, or, like, sql, gte } from "drizzle-orm";

const sqlite = new Database(process.env.DATABASE_PATH ?? "data.db");
const db = drizzle(sqlite);

// Create tables
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guid TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    url TEXT NOT NULL,
    city TEXT NOT NULL,
    city_label TEXT NOT NULL,
    category TEXT NOT NULL,
    keywords TEXT NOT NULL,
    posted_at TEXT NOT NULL,
    fetched_at TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    is_saved INTEGER DEFAULT 0,
    is_contacted INTEGER DEFAULT 0,
    score INTEGER DEFAULT 5
  );
  CREATE TABLE IF NOT EXISTS feed_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    last_fetched_at TEXT,
    total_leads INTEGER DEFAULT 0,
    new_leads INTEGER DEFAULT 0,
    cities_checked INTEGER DEFAULT 0
  );
`);

// Migrate existing db that may not have score column yet
try {
  sqlite.exec(`ALTER TABLE leads ADD COLUMN score INTEGER DEFAULT 5`);
} catch { /* already exists — safe to ignore */ }

// ── Score a lead 1-10 based on keywords + buying signals ─────────────────
const HOT_SIGNALS = [
  "asap", "urgent", "immediately", "right away", "need now", "today",
  "budget", "paid", "paying", "will pay", "pay well", "compensation",
  "serious", "legitimate", "long term", "ongoing", "contract",
  "ready to start", "ready to hire", "looking to hire",
];
const WARM_SIGNALS = [
  "need", "looking for", "want", "require", "seeking", "interested in",
  "help with", "build", "create", "develop", "design", "fix", "update",
];
const HIGH_VALUE_KEYWORDS = [
  "shopify", "ecommerce", "e-commerce", "app developer", "mobile app",
  "android app", "ios app", "flutter", "react native", "full stack",
  "web developer", "website", "web design", "seo", "digital marketing",
];

export function scoreLead(title: string, description: string, keywords: string[]): number {
  const text = (title + " " + description).toLowerCase();
  let score = 3; // base

  // Keyword matches — each one adds points
  score += Math.min(keywords.length, 3); // up to +3 for keyword matches

  // High-value service keywords
  const highValueHits = HIGH_VALUE_KEYWORDS.filter(k => text.includes(k)).length;
  score += Math.min(highValueHits, 2); // up to +2

  // Hot buying signals
  const hotHits = HOT_SIGNALS.filter(s => text.includes(s)).length;
  score += Math.min(hotHits * 2, 3); // up to +3

  // Warm signals
  const warmHits = WARM_SIGNALS.filter(s => text.includes(s)).length;
  score += Math.min(warmHits, 1); // up to +1

  // Has description (more info = better lead)
  if (description && description.length > 50) score += 1;

  return Math.min(Math.max(Math.round(score), 1), 10);
}

// 48-hour cutoff ISO string
function get48hrCutoff(): string {
  return new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
}

export interface IStorage {
  upsertLead(lead: InsertLead): Lead | undefined;
  getLeads(filters: {
    city?: string;
    keyword?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): { leads: Lead[]; total: number };
  getLead(id: number): Lead | undefined;
  updateLead(id: number, updates: Partial<Pick<Lead, "isRead" | "isSaved" | "isContacted">>): Lead | undefined;
  deleteLead(id: number): void;
  purgeOldLeads(): number;
  getStats(): {
    total: number;
    unread: number;
    saved: number;
    contacted: number;
    byCity: Record<string, number>;
    lastFetched: string | null;
    newToday: number;
  };
  getRecentLeads(limit: number): Lead[];
}

export const storage: IStorage = {
  upsertLead(lead: InsertLead): Lead | undefined {
    try {
      // Skip leads older than 48 hours
      const cutoff = get48hrCutoff();
      if (lead.postedAt < cutoff) return undefined;

      // Compute score
      const keywords: string[] = JSON.parse(lead.keywords || "[]");
      const score = scoreLead(lead.title, lead.description ?? "", keywords);

      return db
        .insert(leads)
        .values({ ...lead, score })
        .onConflictDoNothing()
        .returning()
        .get();
    } catch {
      return undefined;
    }
  },

  getLeads({ city, keyword, status, page = 1, limit = 50 }) {
    const cutoff = get48hrCutoff();
    const conditions: any[] = [gte(leads.postedAt, cutoff)];

    if (city && city !== "all") conditions.push(eq(leads.city, city));
    if (keyword) {
      conditions.push(
        or(
          like(leads.title, `%${keyword}%`),
          like(leads.description, `%${keyword}%`)
        )
      );
    }
    if (status === "unread")    conditions.push(eq(leads.isRead, false));
    if (status === "saved")     conditions.push(eq(leads.isSaved, true));
    if (status === "contacted") conditions.push(eq(leads.isContacted, true));

    const allRows = db
      .select()
      .from(leads)
      .where(and(...conditions))
      .orderBy(desc(leads.score), desc(leads.postedAt))
      .all();

    const total = allRows.length;
    const offset = (page - 1) * limit;
    return { leads: allRows.slice(offset, offset + limit), total };
  },

  getLead(id: number): Lead | undefined {
    return db.select().from(leads).where(eq(leads.id, id)).get();
  },

  updateLead(id: number, updates: Partial<Pick<Lead, "isRead" | "isSaved" | "isContacted">>): Lead | undefined {
    db.update(leads).set(updates).where(eq(leads.id, id)).run();
    return db.select().from(leads).where(eq(leads.id, id)).get();
  },

  deleteLead(id: number): void {
    db.delete(leads).where(eq(leads.id, id)).run();
  },

  purgeOldLeads(): number {
    // Delete leads older than 48hrs that haven't been saved or contacted
    const cutoff = get48hrCutoff();
    const result = sqlite.prepare(`
      DELETE FROM leads
      WHERE posted_at < ?
        AND is_saved = 0
        AND is_contacted = 0
    `).run(cutoff);
    return result.changes;
  },

  getStats() {
    const cutoff = get48hrCutoff();
    const today = new Date().toISOString().slice(0, 10);
    const all = db
      .select()
      .from(leads)
      .where(gte(leads.postedAt, cutoff))
      .all();

    const byCity: Record<string, number> = {};
    let unread = 0, saved = 0, contacted = 0, newToday = 0;

    for (const l of all) {
      byCity[l.city] = (byCity[l.city] || 0) + 1;
      if (!l.isRead)     unread++;
      if (l.isSaved)     saved++;
      if (l.isContacted) contacted++;
      if (l.fetchedAt.startsWith(today)) newToday++;
    }

    const stat = db.select().from(feedStats).get();
    return {
      total: all.length,
      unread,
      saved,
      contacted,
      byCity,
      lastFetched: stat?.lastFetched ?? null,
      newToday,
    };
  },

  getRecentLeads(limit: number): Lead[] {
    return db
      .select()
      .from(leads)
      .orderBy(desc(leads.fetchedAt))
      .limit(limit)
      .all();
  },
};
