import type { Express } from "express";
import type { Server } from "http";
import rateLimit from "express-rate-limit";
import { storage } from "./storage";
import { fetchAllFeeds, CITIES } from "./rss-fetcher";
import { runBrowserScrape } from "./browser-scraper";

let isFetching = false;
let lastFetchTime: string | null = null;
let lastNewCount = 0;

// WARN-1 fix: rate limit manual scan — max 1 trigger per 3 minutes per IP
const fetchLimiter = rateLimit({
  windowMs: 3 * 60 * 1000,
  max: 1,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: "rate_limited", message: "Too many scan requests. Try again in 3 minutes." },
});

// Auto-fetch on startup — RSS first (fast), then browser scrape (slower)
setTimeout(async () => {
  if (isFetching) return;
  isFetching = true;
  try {
    const { newCount: rssCount } = await fetchAllFeeds();
    const { newCount: browserCount } = await runBrowserScrape();
    lastFetchTime = new Date().toISOString();
    lastNewCount = rssCount + browserCount;
  } finally {
    isFetching = false;
  }
}, 2000);

export async function registerRoutes(httpServer: Server, app: Express) {
  // GET /api/leads
  app.get("/api/leads", (req, res) => {
    const { city, keyword, status, page, limit } = req.query;
    // WARN-2 fix: validate and clamp pagination params
    const safePage = Math.max(parseInt(page as string) || 1, 1);
    const safeLimit = Math.min(Math.max(parseInt(limit as string) || 50, 1), 200);
    const result = storage.getLeads({
      city: city as string,
      keyword: keyword as string,
      status: status as string,
      page: safePage,
      limit: safeLimit,
    });
    res.json(result);
  });

  // GET /api/leads/:id
  app.get("/api/leads/:id", (req, res) => {
    const lead = storage.getLead(parseInt(req.params.id));
    if (!lead) return res.status(404).json({ error: "Not found" });
    res.json(lead);
  });

  // PATCH /api/leads/:id
  app.patch("/api/leads/:id", (req, res) => {
    const { isRead, isSaved, isContacted } = req.body;
    const updated = storage.updateLead(parseInt(req.params.id), { isRead, isSaved, isContacted });
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  });

  // DELETE /api/leads/:id
  app.delete("/api/leads/:id", (req, res) => {
    storage.deleteLead(parseInt(req.params.id));
    res.json({ success: true });
  });

  // GET /api/stats
  app.get("/api/stats", (req, res) => {
    const stats = storage.getStats();
    res.json({
      ...stats,
      isFetching,
      lastFetched: lastFetchTime,
      newLastFetch: lastNewCount,
      cities: CITIES,
    });
  });

  // POST /api/fetch — manual trigger (rate limited)
  app.post("/api/fetch", fetchLimiter, async (req, res) => {
    if (isFetching) {
      return res.json({ status: "already_running" });
    }
    isFetching = true;
    res.json({ status: "started" });
    try {
      const purged = storage.purgeOldLeads();
      if (purged > 0) console.log(`[Scan] Purged ${purged} leads older than 48hrs`);
      const { newCount: rssCount, citiesChecked: rssCities } = await fetchAllFeeds();
      console.log(`[RSS] ${rssCount} new leads across ${rssCities} sources`);
      const { newCount: browserCount, citiesChecked: browserCities } = await runBrowserScrape();
      console.log(`[Browser] ${browserCount} new leads across ${browserCities} sites`);
      lastFetchTime = new Date().toISOString();
      lastNewCount = rssCount + browserCount;
      console.log(`[Scan] Total: ${lastNewCount} new leads`);
    } finally {
      isFetching = false;
    }
  });

  // GET /api/cities
  app.get("/api/cities", (req, res) => {
    res.json(CITIES);
  });
}
