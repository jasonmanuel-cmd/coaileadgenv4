import type { Express } from "express";
import type { Server } from "http";
import rateLimit from "express-rate-limit";
import { storage, persistStats } from "./storage";
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
    persistStats(lastNewCount, rssCities + (BROWSER_ENABLED ? 1 : 0));
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

  // ── Printable HTML report of all leads ──────────────────────────────────
  app.get("/print-report", (req, res) => {
    const allLeads = storage.getLeads({ limit: 9999 });
    const stats = storage.getStats();

    const scoreLabel = (s: number | null) => ((s ?? 5) >= 8 ? "HOT" : (s ?? 5) >= 5 ? "WARM" : "COLD");
    const scoreColor = (s: number | null) => ((s ?? 5) >= 8 ? "#22c55e" : (s ?? 5) >= 5 ? "#eab308" : "#71717a");
    const fmtDate = (d: string) => {
      try {
        return new Date(d).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      } catch {
        return d;
      }
    };
    const timeAgo = (d: string) => {
      const diff = Date.now() - new Date(d).getTime();
      const h = Math.floor(diff / 3600000);
      return h < 1 ? `${Math.floor(diff / 60000)}m` : h < 24 ? `${h}h` : `${Math.floor(h / 24)}d`;
    };

    res.type("html").send(`
<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8">
<title>COAI Lead Monitor — Full Report</title>
<style>
  @page { margin: 0.4in; size: landscape; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; font-size: 10px; color: #111; background: #fff; padding: 16px; }
  h1 { font-size: 16px; margin-bottom: 2px; }
  .subtitle { font-size: 10px; color: #666; margin-bottom: 8px; }
  .stats-row { display: flex; gap: 8px; margin-bottom: 10px; }
  .stat-box { background: #f4f4f5; border-radius: 4px; padding: 4px 10px; text-align: center; }
  .stat-box .val { font-size: 14px; font-weight: bold; }
  .stat-box .lbl { font-size: 8px; color: #666; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; font-size: 9px; }
  th { background: #18181b; color: #fff; padding: 4px 6px; text-align: left; font-size: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
  td { padding: 3px 6px; border-bottom: 1px solid #e4e4e7; vertical-align: top; }
  tr:nth-child(even) td { background: #fafafa; }
  .badge { display: inline-block; padding: 1px 5px; border-radius: 3px; font-size: 8px; font-weight: bold; color: #fff; }
  .kw { display: inline-block; font-size: 7px; padding: 0 4px; border: 1px solid #d4d4d8; border-radius: 3px; margin: 1px; color: #52525b; }
  a { color: #2563eb; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .footer { margin-top: 8px; font-size: 8px; color: #999; text-align: center; }
  @media print { .no-print { display: none; } }
</style></head><body>
  <div class="no-print" style="margin-bottom:8px"><button onclick="window.print()" style="padding:4px 12px;font-size:11px;cursor:pointer">🖨️ Print / Save PDF</button></div>
  <h1>COAI Lead Monitor — Full Report</h1>
  <div class="subtitle">Generated ${new Date().toLocaleString()} · ${allLeads.leads.length} leads · ${stats.lastFetched ? "Last scan " + timeAgo(stats.lastFetched) + " ago" : "No scan yet"}</div>
  <div class="stats-row">
    <div class="stat-box"><div class="val">${stats.total}</div><div class="lbl">Total</div></div>
    <div class="stat-box"><div class="val" style="color:#16a34a">${stats.unread}</div><div class="lbl">Unread</div></div>
    <div class="stat-box"><div class="val" style="color:#ca8a04">${stats.saved}</div><div class="lbl">Saved</div></div>
    <div class="stat-box"><div class="val" style="color:#2563eb">${stats.contacted}</div><div class="lbl">Contacted</div></div>
    <div class="stat-box"><div class="val" style="color:#16a34a">${stats.newToday}</div><div class="lbl">New Today</div></div>
  </div>
  <table>
    <thead><tr>
      <th style="width:28px">#</th>
      <th style="width:32px">Score</th>
      <th>Title</th>
      <th style="width:100px">Source</th>
      <th style="width:70px">Category</th>
      <th style="width:70px">Posted</th>
      <th style="width:60px">Status</th>
      <th>Keywords</th>
    </tr></thead>
    <tbody>
      ${allLeads.leads
        .map((l, i) => {
          const kws = JSON.parse(l.keywords || "[]") as string[];
          return `<tr>
          <td>${i + 1}</td>
          <td><span class="badge" style="background:${scoreColor(l.score)}">${l.score} ${scoreLabel(l.score)}</span></td>
          <td><a href="${l.url}" target="_blank">${l.title}</a>${l.description ? `<br><span style="color:#71717a;font-size:8px">${l.description.slice(0, 100)}${l.description.length > 100 ? "…" : ""}</span>` : ""}</td>
          <td>${l.cityLabel}</td>
          <td>${l.category}</td>
          <td>${fmtDate(l.postedAt)}</td>
          <td>${l.isSaved ? "★ Saved" : ""}${l.isContacted ? " ✓ Done" : ""}${l.isRead ? "" : " ● New"}</td>
          <td>${kws.map((k) => `<span class="kw">${k}</span>`).join("")}</td>
        </tr>`;
        })
        .join("\n      ")}
    </tbody>
  </table>
  <div class="footer">COAI Lead Monitor · ${allLeads.leads.length} leads · Page 1</div>
</body></html>
`);
  });
}
