import type { Express } from "express";
import type { Server } from "http";
import rateLimit from "express-rate-limit";
import { storage } from "./storage";
import { fetchAllFeeds, CITIES } from "./rss-fetcher";
import { runBrowserScrape } from "./browser-scraper";

let isFetching = false;
let lastFetchTime: string | null = null;
let lastNewCount = 0;

// Set DISABLE_BROWSER=true on Railway (not enough RAM for Chromium on free tier)
// Leave unset locally to also get Craigslist, Thumbtack, Nextdoor
const BROWSER_ENABLED = process.env.DISABLE_BROWSER !== "true";

const fetchLimiter = rateLimit({
  windowMs: 3 * 60 * 1000,
  max: 1,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: "rate_limited", message: "Too many scan requests. Try again in 3 minutes." },
});

async function runFullScan() {
  if (isFetching) return;
  isFetching = true;
  try {
    const purged = storage.purgeOldLeads();
    if (purged > 0) console.log(`[Scan] Purged ${purged} leads older than 48hrs`);

    const { newCount: rssCount, citiesChecked: rssCities } = await fetchAllFeeds();
    console.log(`[RSS] ${rssCount} new leads across ${rssCities} sources`);

    let browserCount = 0;
    if (BROWSER_ENABLED) {
      const result = await runBrowserScrape();
      browserCount = result.newCount;
      console.log(`[Browser] ${browserCount} new leads`);
    } else {
      console.log(`[Browser] Skipped — DISABLE_BROWSER=true`);
    }

    lastFetchTime = new Date().toISOString();
    lastNewCount = rssCount + browserCount;
    console.log(`[Scan] Total: ${lastNewCount} new leads`);
  } finally {
    isFetching = false;
  }
}

// Scan on startup after 3s
setTimeout(runFullScan, 3000);

// Auto-scan every 2 hours
setInterval(runFullScan, 2 * 60 * 60 * 1000);

export async function registerRoutes(httpServer: Server, app: Express) {
  app.get("/api/leads", (req, res) => {
    const { city, keyword, status, page, limit } = req.query;
    const safePage  = Math.max(parseInt(page as string) || 1, 1);
    const safeLimit = Math.min(Math.max(parseInt(limit as string) || 50, 1), 200);
    const result = storage.getLeads({
      city:    city    as string,
      keyword: keyword as string,
      status:  status  as string,
      page:    safePage,
      limit:   safeLimit,
    });
    res.json(result);
  });

  app.get("/api/leads/:id", (req, res) => {
    const lead = storage.getLead(parseInt(req.params.id));
    if (!lead) return res.status(404).json({ error: "Not found" });
    res.json(lead);
  });

  app.patch("/api/leads/:id", (req, res) => {
    const { isRead, isSaved, isContacted } = req.body;
    const updated = storage.updateLead(parseInt(req.params.id), { isRead, isSaved, isContacted });
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  });

  app.delete("/api/leads/:id", (req, res) => {
    storage.deleteLead(parseInt(req.params.id));
    res.json({ success: true });
  });

  app.get("/api/stats", (req, res) => {
    const stats = storage.getStats();
    res.json({
      ...stats,
      isFetching,
      lastFetched: lastFetchTime,
      newLastFetch: lastNewCount,
      cities: CITIES,
      browserEnabled: BROWSER_ENABLED,
    });
  });

  app.post("/api/fetch", fetchLimiter, async (req, res) => {
    if (isFetching) return res.json({ status: "already_running" });
    res.json({ status: "started" });
    runFullScan();
  });

  app.get("/api/cities", (req, res) => {
    res.json(CITIES);
  });
}
