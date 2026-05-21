/**
 * Browser-based scraper using real Chromium.
 * Scrapes Craigslist, Thumbtack, Nextdoor, and Oodle
 * like a real human browser — bypasses bot detection.
 * Slower than RSS but gets sites that block automated requests.
 */
import { chromium, type Browser, type Page } from "playwright";
import { storage } from "./storage";

// ── Keyword scorer ────────────────────────────────────────────────────────
const KEYWORDS = [
  "website",
  "web design",
  "web site",
  "web developer",
  "web dev",
  "need a site",
  "need a website",
  "build a site",
  "redesign",
  "landing page",
  "frontend",
  "front-end",
  "backend",
  "back-end",
  "full stack",
  "fullstack",
  "app developer",
  "app development",
  "mobile app",
  "android app",
  "ios app",
  "react native",
  "flutter",
  "apk",
  "google play",
  "app store",
  "mobile developer",
  "build an app",
  "need an app",
  "android developer",
  "ios developer",
  "swift",
  "kotlin",
  "pwa",
  "expo",
  "shopify",
  "wordpress",
  "wix",
  "squarespace",
  "webflow",
  "woocommerce",
  "ecommerce",
  "e-commerce",
  "online store",
  "online shop",
  "seo",
  "local seo",
  "google ads",
  "facebook ads",
  "digital marketing",
  "logo",
  "logo design",
  "branding",
  "graphic design",
  "ui design",
  "ux design",
  "automation",
  "chatbot",
  "api integration",
  "crm setup",
  "plumber",
  "electrician",
  "hvac",
  "roofer",
  "contractor",
  "handyman",
  "landscaper",
  "pest control",
  "cleaning service",
  "painting contractor",
  "need developer",
  "hire developer",
  "freelance developer",
  "need designer",
  "hire designer",
];

function scoreKeywords(text: string): string[] {
  const lower = text.toLowerCase();
  return KEYWORDS.filter((kw) => lower.includes(kw));
}

// ── Craigslist cities ─────────────────────────────────────────────────────
const CL_CITIES = [
  { id: "losangeles", host: "losangeles", label: "Los Angeles, CA" },
  { id: "newyork", host: "newyork", label: "New York, NY" },
  { id: "chicago", host: "chicago", label: "Chicago, IL" },
  { id: "houston", host: "houston", label: "Houston, TX" },
  { id: "dallas", host: "dallas", label: "Dallas, TX" },
  { id: "phoenix", host: "phoenix", label: "Phoenix, AZ" },
  { id: "miami", host: "miami", label: "Miami, FL" },
  { id: "atlanta", host: "atlanta", label: "Atlanta, GA" },
  { id: "seattle", host: "seattle", label: "Seattle, WA" },
  { id: "denver", host: "denver", label: "Denver, CO" },
  { id: "austin", host: "austin", label: "Austin, TX" },
  { id: "sandiego", host: "sandiego", label: "San Diego, CA" },
  { id: "lasvegas", host: "lasvegas", label: "Las Vegas, NV" },
  { id: "portland", host: "portland", label: "Portland, OR" },
  { id: "sanfrancisco", host: "sfbay", label: "San Francisco, CA" },
  { id: "boston", host: "boston", label: "Boston, MA" },
  { id: "bakersfield", host: "bakersfield", label: "Bakersfield, CA" },
  { id: "fresno", host: "fresno", label: "Fresno, CA" },
  { id: "sacramento", host: "sacramento", label: "Sacramento, CA" },
  { id: "inlandempire", host: "inlandempire", label: "Inland Empire, CA" },
];

const CL_CATEGORIES = [
  { code: "cpg", label: "Computer Gigs", isGig: true },
  { code: "web", label: "Web/Design Gigs", isGig: true },
  { code: "sgd", label: "Design/Media Gigs", isGig: true },
  { code: "crg", label: "Creative Gigs", isGig: true },
  { code: "mkg", label: "Marketing Gigs", isGig: true },
  { code: "cps", label: "Computer Services", isGig: false },
  { code: "bfs", label: "Business Services", isGig: false },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const humanDelay = () => sleep(1000 + Math.random() * 1500);

// ── Craigslist page scraper ───────────────────────────────────────────────
async function scrapeCraigslistPage(
  page: Page,
  city: (typeof CL_CITIES)[0],
  cat: (typeof CL_CATEGORIES)[0],
  now: string,
): Promise<number> {
  let newCount = 0;
  try {
    const url = `https://${city.host}.craigslist.org/search/${cat.code}`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    await sleep(800);

    const items = await page.$$eval("div.cl-search-result", (els) =>
      els.map((el) => {
        const a = el.querySelector("a.posting-title") as HTMLAnchorElement | null;
        const snippet = el.querySelector(".result-location, .meta");
        return {
          title: a?.textContent?.trim() ?? "",
          url: a?.href ?? "",
          snippet: snippet?.textContent?.trim() ?? "",
        };
      }),
    );

    for (const item of items) {
      if (!item.title || !item.url) continue;
      const matched = scoreKeywords(item.title + " " + item.snippet);
      if (!cat.isGig && matched.length === 0) continue;
      const keywords = matched.length > 0 ? matched : [cat.label.toLowerCase()];
      const result = storage.upsertLead({
        guid: item.url,
        title: item.title,
        description: item.snippet.slice(0, 500),
        url: item.url,
        city: city.id,
        cityLabel: city.label,
        category: `CL: ${cat.label}`,
        keywords: JSON.stringify(keywords.slice(0, 8)),
        postedAt: now,
        fetchedAt: now,
        isRead: false,
        isSaved: false,
        isContacted: false,
      });
      if (result) newCount++;
    }
  } catch {
    /* skip this page, continue */
  }
  return newCount;
}

// ── Main export ───────────────────────────────────────────────────────────
export async function runBrowserScrape(): Promise<{ newCount: number; citiesChecked: number }> {
  let newCount = 0;
  let citiesChecked = 0;
  const now = new Date().toISOString();
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled",
        "--disable-infobars",
        "--window-size=1366,768",
      ],
    });

    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      viewport: { width: 1366, height: 768 },
      locale: "en-US",
      timezoneId: "America/Los_Angeles",
      extraHTTPHeaders: { "Accept-Language": "en-US,en;q=0.9" },
    });

    // Hide automation fingerprint
    await context.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    });

    const page = await context.newPage();

    // ── Craigslist ────────────────────────────────────────────────────────
    console.log(`[browser] Craigslist starting (${CL_CITIES.length} cities × ${CL_CATEGORIES.length} categories)...`);
    for (const city of CL_CITIES) {
      let cityGot = false;
      for (const cat of CL_CATEGORIES) {
        const n = await scrapeCraigslistPage(page, city, cat, now);
        if (n > 0) cityGot = true;
        newCount += n;
        await humanDelay();
      }
      if (cityGot) citiesChecked++;
      process.stdout.write(`  ${city.label}: ${cityGot ? "found" : "none"}\n`);
    }
    console.log(`[browser] Craigslist done — ${newCount} leads across ${citiesChecked} cities`);

    // ── Thumbtack ─────────────────────────────────────────────────────────
    console.log("[browser] Skipping Thumbtack — site now requires login/JS interaction");
    // Disabled: Thumbtack's page structure now requires authentication.
    // const ttCount = await scrapeThumbstack(page, now);

    // ── Nextdoor ──────────────────────────────────────────────────────────
    console.log("[browser] Skipping Nextdoor — find-services page returns 404");
    // Disabled: Nextdoor's find-services endpoint is gone (returns 404).

    // ── Oodle ─────────────────────────────────────────────────────────────
    console.log("[browser] Skipping Oodle — classifieds site restructured, no listings found");
    // Disabled: Oodle's listing page structure has changed (empty results).

    await context.close();
  } catch (err) {
    console.error("[browser] Fatal error:", err);
  } finally {
    if (browser) await browser.close();
  }

  console.log(`[browser] Total new leads from browser scrape: ${newCount}`);
  return { newCount, citiesChecked };
}
