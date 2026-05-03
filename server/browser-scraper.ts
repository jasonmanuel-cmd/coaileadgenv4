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
  "website", "web design", "web site", "web developer", "web dev",
  "need a site", "need a website", "build a site", "redesign", "landing page",
  "frontend", "front-end", "backend", "back-end", "full stack", "fullstack",
  "app developer", "app development", "mobile app", "android app", "ios app",
  "react native", "flutter", "apk", "google play", "app store",
  "mobile developer", "build an app", "need an app", "android developer",
  "ios developer", "swift", "kotlin", "pwa", "expo",
  "shopify", "wordpress", "wix", "squarespace", "webflow", "woocommerce",
  "ecommerce", "e-commerce", "online store", "online shop",
  "seo", "local seo", "google ads", "facebook ads", "digital marketing",
  "logo", "logo design", "branding", "graphic design", "ui design", "ux design",
  "automation", "chatbot", "api integration", "crm setup",
  "plumber", "electrician", "hvac", "roofer", "contractor", "handyman",
  "landscaper", "pest control", "cleaning service", "painting contractor",
  "need developer", "hire developer", "freelance developer",
  "need designer", "hire designer",
];

function scoreKeywords(text: string): string[] {
  const lower = text.toLowerCase();
  return KEYWORDS.filter(kw => lower.includes(kw));
}

// ── Craigslist cities ─────────────────────────────────────────────────────
const CL_CITIES = [
  { id: "losangeles",   host: "losangeles",   label: "Los Angeles, CA" },
  { id: "newyork",      host: "newyork",      label: "New York, NY" },
  { id: "chicago",      host: "chicago",      label: "Chicago, IL" },
  { id: "houston",      host: "houston",      label: "Houston, TX" },
  { id: "dallas",       host: "dallas",       label: "Dallas, TX" },
  { id: "phoenix",      host: "phoenix",      label: "Phoenix, AZ" },
  { id: "miami",        host: "miami",        label: "Miami, FL" },
  { id: "atlanta",      host: "atlanta",      label: "Atlanta, GA" },
  { id: "seattle",      host: "seattle",      label: "Seattle, WA" },
  { id: "denver",       host: "denver",       label: "Denver, CO" },
  { id: "austin",       host: "austin",       label: "Austin, TX" },
  { id: "sandiego",     host: "sandiego",     label: "San Diego, CA" },
  { id: "lasvegas",     host: "lasvegas",     label: "Las Vegas, NV" },
  { id: "portland",     host: "portland",     label: "Portland, OR" },
  { id: "sanfrancisco", host: "sfbay",        label: "San Francisco, CA" },
  { id: "boston",       host: "boston",       label: "Boston, MA" },
  { id: "bakersfield",  host: "bakersfield",  label: "Bakersfield, CA" },
  { id: "fresno",       host: "fresno",       label: "Fresno, CA" },
  { id: "sacramento",   host: "sacramento",   label: "Sacramento, CA" },
  { id: "inlandempire", host: "inlandempire", label: "Inland Empire, CA" },
];

const CL_CATEGORIES = [
  { code: "cpg", label: "Computer Gigs",      isGig: true },
  { code: "web", label: "Web/Design Gigs",    isGig: true },
  { code: "sgd", label: "Design/Media Gigs",  isGig: true },
  { code: "crg", label: "Creative Gigs",      isGig: true },
  { code: "mkg", label: "Marketing Gigs",     isGig: true },
  { code: "cps", label: "Computer Services",  isGig: false },
  { code: "bfs", label: "Business Services",  isGig: false },
];

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const humanDelay = () => sleep(1000 + Math.random() * 1500);

// ── Craigslist page scraper ───────────────────────────────────────────────
async function scrapeCraigslistPage(
  page: Page,
  city: typeof CL_CITIES[0],
  cat: typeof CL_CATEGORIES[0],
  now: string,
): Promise<number> {
  let newCount = 0;
  try {
    const url = `https://${city.host}.craigslist.org/search/${cat.code}`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    await sleep(800);

    const items = await page.$$eval(
      'li.cl-search-result, div.result-row',
      (els) => els.map(el => {
        const a = el.querySelector('a.cl-app-anchor, a.result-title') as HTMLAnchorElement | null;
        const snippet = el.querySelector('.cl-row-text, .result-snippet');
        return {
          title:   a?.textContent?.trim() ?? "",
          url:     a?.href ?? "",
          snippet: snippet?.textContent?.trim() ?? "",
        };
      })
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
  } catch { /* skip this page, continue */ }
  return newCount;
}

// ── Thumbtack scraper ─────────────────────────────────────────────────────
async function scrapeThumbstack(page: Page, now: string): Promise<number> {
  let newCount = 0;
  const searches = [
    { q: "web-design",      label: "Web Design" },
    { q: "website-design",  label: "Website Design" },
    { q: "logo-design",     label: "Logo Design" },
    { q: "seo",             label: "SEO" },
    { q: "app-development", label: "App Development" },
    { q: "graphic-design",  label: "Graphic Design" },
    { q: "digital-marketing", label: "Digital Marketing" },
  ];

  for (const { q, label } of searches) {
    try {
      await page.goto(`https://www.thumbtack.com/k/${q}/near-me/`, {
        waitUntil: "domcontentloaded", timeout: 15000,
      });
      await sleep(1000);

      const items = await page.$$eval(
        '[data-test="provider-card"], .provider-card, article',
        (els) => els.slice(0, 25).map(el => ({
          title:   el.querySelector('h3, h2, [class*="name"]')?.textContent?.trim() ?? "",
          url:     (el.querySelector('a') as HTMLAnchorElement)?.href ?? "",
          snippet: el.querySelector('p, [class*="description"], [class*="bio"]')?.textContent?.trim() ?? "",
        }))
      );

      for (const item of items) {
        if (!item.title || !item.url) continue;
        const matched = scoreKeywords(item.title + " " + item.snippet + " " + label);
        const result = storage.upsertLead({
          guid: item.url,
          title: `[${label}] ${item.title}`,
          description: item.snippet.slice(0, 500),
          url: item.url,
          city: "thumbtack",
          cityLabel: "Thumbtack",
          category: `Thumbtack: ${label}`,
          keywords: JSON.stringify((matched.length > 0 ? matched : [q]).slice(0, 8)),
          postedAt: now,
          fetchedAt: now,
          isRead: false,
          isSaved: false,
          isContacted: false,
        });
        if (result) newCount++;
      }
    } catch { /* skip */ }
    await humanDelay();
  }
  return newCount;
}

// ── Nextdoor public services directory ───────────────────────────────────
async function scrapeNextdoor(page: Page, now: string): Promise<number> {
  let newCount = 0;
  const searches = [
    "web design", "website", "app developer", "seo", "logo design",
    "graphic design", "digital marketing",
  ];

  for (const term of searches) {
    try {
      const encoded = encodeURIComponent(term);
      await page.goto(`https://nextdoor.com/find-services/?query=${encoded}`, {
        waitUntil: "domcontentloaded", timeout: 15000,
      });
      await sleep(1200);

      const items = await page.$$eval(
        '[data-testid*="business"], [class*="BusinessCard"], [class*="service-result"]',
        (els) => els.slice(0, 20).map(el => ({
          title:   el.querySelector('h2, h3, [class*="name"], [class*="title"]')?.textContent?.trim() ?? "",
          url:     (el.querySelector('a') as HTMLAnchorElement)?.href ?? "",
          snippet: el.querySelector('p, [class*="description"]')?.textContent?.trim() ?? "",
        }))
      );

      for (const item of items) {
        if (!item.title) continue;
        const url = item.url || `https://nextdoor.com/find-services/?query=${encoded}`;
        const matched = scoreKeywords(item.title + " " + item.snippet + " " + term);
        const result = storage.upsertLead({
          guid: `nextdoor-${item.title}-${term}`.replace(/\s+/g, "-").toLowerCase(),
          title: item.title,
          description: item.snippet.slice(0, 500),
          url,
          city: "nextdoor",
          cityLabel: "Nextdoor",
          category: `Nextdoor: ${term}`,
          keywords: JSON.stringify((matched.length > 0 ? matched : [term]).slice(0, 8)),
          postedAt: now,
          fetchedAt: now,
          isRead: false,
          isSaved: false,
          isContacted: false,
        });
        if (result) newCount++;
      }
    } catch { /* skip */ }
    await humanDelay();
  }
  return newCount;
}

// ── Oodle classifieds (aggregates local + CL-style posts) ────────────────
async function scrapeOodle(page: Page, now: string): Promise<number> {
  let newCount = 0;
  const searches = [
    "web+design", "web+developer", "app+developer",
    "website", "seo", "logo+design", "mobile+app",
  ];

  for (const term of searches) {
    try {
      await page.goto(`https://www.oodle.com/for-sale/q-${term}/`, {
        waitUntil: "domcontentloaded", timeout: 15000,
      });
      await sleep(700);

      const items = await page.$$eval('li.listing', (els) =>
        els.map(el => ({
          title:   el.querySelector('a.title')?.textContent?.trim() ?? "",
          url:     (el.querySelector('a.title') as HTMLAnchorElement)?.href ?? "",
          snippet: el.querySelector('.description')?.textContent?.trim() ?? "",
        }))
      );

      for (const item of items) {
        if (!item.title || !item.url) continue;
        const matched = scoreKeywords(item.title + " " + item.snippet);
        if (matched.length === 0) continue;
        const result = storage.upsertLead({
          guid: item.url,
          title: item.title,
          description: item.snippet.slice(0, 500),
          url: item.url,
          city: "oodle",
          cityLabel: "Oodle",
          category: "Oodle Classifieds",
          keywords: JSON.stringify(matched.slice(0, 8)),
          postedAt: now,
          fetchedAt: now,
          isRead: false,
          isSaved: false,
          isContacted: false,
        });
        if (result) newCount++;
      }
    } catch { /* skip */ }
    await humanDelay();
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
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
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
    console.log("[browser] Craigslist starting...");
    for (const city of CL_CITIES) {
      let cityGot = false;
      for (const cat of CL_CATEGORIES) {
        const n = await scrapeCraigslistPage(page, city, cat, now);
        if (n > 0) cityGot = true;
        newCount += n;
        await humanDelay();
      }
      if (cityGot) citiesChecked++;
    }
    console.log(`[browser] Craigslist done — ${newCount} leads`);

    // ── Thumbtack ─────────────────────────────────────────────────────────
    console.log("[browser] Thumbtack starting...");
    const ttCount = await scrapeThumbstack(page, now);
    newCount += ttCount;
    if (ttCount > 0) citiesChecked++;
    console.log(`[browser] Thumbtack done — +${ttCount}`);

    // ── Nextdoor ──────────────────────────────────────────────────────────
    console.log("[browser] Nextdoor starting...");
    const ndCount = await scrapeNextdoor(page, now);
    newCount += ndCount;
    if (ndCount > 0) citiesChecked++;
    console.log(`[browser] Nextdoor done — +${ndCount}`);

    // ── Oodle ─────────────────────────────────────────────────────────────
    console.log("[browser] Oodle starting...");
    const oodleCount = await scrapeOodle(page, now);
    newCount += oodleCount;
    if (oodleCount > 0) citiesChecked++;
    console.log(`[browser] Oodle done — +${oodleCount}`);

    await context.close();
  } catch (err) {
    console.error("[browser] Fatal error:", err);
  } finally {
    if (browser) await browser.close();
  }

  console.log(`[browser] Total new leads from browser scrape: ${newCount}`);
  return { newCount, citiesChecked };
}
