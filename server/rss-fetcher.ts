import fetch from "node-fetch";
import xml2js from "xml2js";
import { storage } from "./storage";

// ── Cities (kept for sidebar stats) ─────────────────────────────────────────
export const CITIES = [
  { id: "losangeles",     label: "Los Angeles, CA" },
  { id: "newyork",        label: "New York, NY" },
  { id: "chicago",        label: "Chicago, IL" },
  { id: "houston",        label: "Houston, TX" },
  { id: "phoenix",        label: "Phoenix, AZ" },
  { id: "dallas",         label: "Dallas, TX" },
  { id: "sanfrancisco",   label: "San Francisco, CA" },
  { id: "seattle",        label: "Seattle, WA" },
  { id: "miami",          label: "Miami, FL" },
  { id: "atlanta",        label: "Atlanta, GA" },
  { id: "denver",         label: "Denver, CO" },
  { id: "boston",         label: "Boston, MA" },
  { id: "portland",       label: "Portland, OR" },
  { id: "lasvegas",       label: "Las Vegas, NV" },
  { id: "sandiego",       label: "San Diego, CA" },
  { id: "austin",         label: "Austin, TX" },
  { id: "nashville",      label: "Nashville, TN" },
  { id: "charlotte",      label: "Charlotte, NC" },
  { id: "minneapolis",    label: "Minneapolis, MN" },
  { id: "saltlakecity",   label: "Salt Lake City, UT" },
  { id: "bakersfield",    label: "Bakersfield, CA" },
  { id: "fresno",         label: "Fresno, CA" },
  { id: "sacramento",     label: "Sacramento, CA" },
  { id: "stockton",       label: "Stockton, CA" },
  { id: "inlandempire",   label: "Inland Empire, CA" },
  { id: "tucson",         label: "Tucson, AZ" },
  { id: "albuquerque",    label: "Albuquerque, NM" },
  { id: "elpaso",         label: "El Paso, TX" },
  { id: "reno",           label: "Reno, NV" },
  { id: "boise",          label: "Boise, ID" },
  { id: "spokane",        label: "Spokane, WA" },
  { id: "tacoma",         label: "Tacoma, WA" },
  { id: "eugene",         label: "Eugene, OR" },
  { id: "tulsa",          label: "Tulsa, OK" },
  { id: "modesto",        label: "Modesto, CA" },
  { id: "visalia",        label: "Visalia, CA" },
  { id: "santabarbara",   label: "Santa Barbara, CA" },
  { id: "reddit",         label: "Reddit" },
  { id: "weworkremotely", label: "WeWorkRemotely" },
  { id: "remoteok",       label: "RemoteOK" },
  { id: "thumbtack",      label: "Thumbtack" },
  { id: "nextdoor",       label: "Nextdoor" },
  { id: "oodle",          label: "Oodle" },
];

// ── Keywords ─────────────────────────────────────────────────────────────────
const KEYWORDS = [
  // Website / web design
  "website", "web design", "web site", "webpage", "web page",
  "need a site", "need a website", "want a website", "build a site",
  "online presence", "broken site", "fix my site", "fix our site",
  "redesign", "site redesign", "website repair", "website update",
  "website help", "build site", "need web", "web developer", "web dev",
  "frontend", "front-end", "front end", "backend", "back-end", "back end",
  "full stack", "fullstack", "full-stack",
  // App / mobile dev
  "app developer", "app development", "mobile app", "android app", "ios app",
  "react native", "flutter", "apk", "google play", "app store",
  "mobile developer", "app design", "build an app", "need an app",
  "app builder", "ios developer", "android developer", "swift", "kotlin",
  "cross platform", "pwa", "progressive web app", "expo", "capacitor",
  // Platforms
  "shopify", "wordpress", "wix", "squarespace", "webflow", "godaddy",
  "woocommerce", "google sites", "elementor", "divi", "bubble", "framer",
  "figma to code", "webflow developer",
  // Digital marketing / SEO
  "seo", "local seo", "google ads", "facebook ads", "digital marketing",
  "social media", "google listing", "google business", "yelp page",
  "landing page", "sales funnel", "email marketing", "mailchimp",
  // Design
  "logo", "logo design", "branding", "graphic design", "flyer",
  "business card", "banner design", "ui design", "ux design", "ui/ux",
  // Ecommerce
  "ecommerce", "e-commerce", "online store", "online shop",
  // Automation / AI / integrations
  "automation", "zapier", "make.com", "chatbot", "ai tool",
  "workflow automation", "crm setup", "airtable", "api integration",
  "n8n", "power automate",
  // Contractor / trades (local biz needing web presence)
  "plumber", "electrician", "hvac", "roofer", "roofing", "contractor",
  "handyman", "landscaper", "pest control", "auto repair", "mechanic",
  "cleaning service", "moving company", "painting contractor",
  "general contractor", "construction company",
  // Hiring signals
  "looking for developer", "need developer", "hire developer",
  "freelance developer", "contract developer", "part time developer",
  "looking for designer", "need designer",
];

function scoreKeywords(text: string): string[] {
  const lower = text.toLowerCase();
  return KEYWORDS.filter(kw => lower.includes(kw));
}

// ── HTTP fetch + XML parse ───────────────────────────────────────────────────
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "application/rss+xml, application/xml, text/xml, */*",
  "Accept-Language": "en-US,en;q=0.9",
};

async function fetchXML(url: string): Promise<any[]> {
  try {
    const res = await fetch(url, {
      headers: HEADERS,
      signal: AbortSignal.timeout(12000),
    } as any);
    if (!res.ok) return [];
    const xml = await res.text();
    const parsed = await xml2js.parseStringPromise(xml, { explicitArray: true });
    const rssItems = parsed?.rss?.channel?.[0]?.item;
    if (rssItems?.length) return rssItems;
    const atomEntries = parsed?.feed?.entry;
    if (atomEntries?.length) return atomEntries;
    return [];
  } catch {
    return [];
  }
}

// ── Normalize RSS / Atom items ───────────────────────────────────────────────
interface NormalItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  guid: string;
}

function normalizeItem(item: any): NormalItem | null {
  try {
    const title =
      (typeof item.title === "string" ? item.title : item.title?.[0]?._ ?? item.title?.[0]) ?? "";
    const link =
      item.link?.[0] ?? (typeof item.link === "string" ? item.link : "") ?? item.url?.[0] ?? "";
    const description =
      item.description?.[0] ??
      item.summary?.[0]?._ ??
      item.content?.[0]?._ ??
      item["content:encoded"]?.[0] ?? "";
    const pubDate =
      item.pubDate?.[0] ?? item.published?.[0] ?? item.updated?.[0] ?? new Date().toISOString();
    const rawGuid = item.guid?.[0] ?? item.id?.[0];
    const guid: string =
      typeof rawGuid === "object" && rawGuid !== null && "_" in rawGuid
        ? (rawGuid as { _: string })._
        : typeof rawGuid === "string" ? rawGuid : link;

    const titleStr = typeof title === "string" ? title.trim() : "";
    const linkStr  = typeof link  === "string" ? link.trim()  : "";
    if (!linkStr || !titleStr) return null;

    return {
      title: titleStr,
      link: linkStr,
      description: (typeof description === "string" ? description : "")
        .replace(/<[^>]+>/g, "").trim().slice(0, 600),
      pubDate,
      guid,
    };
  } catch {
    return null;
  }
}

// ── Source list ───────────────────────────────────────────────────────────────
interface Source {
  url: string;
  city: string;
  cityLabel: string;
  category: string;
  broadCapture: boolean;
}

function buildSources(): Source[] {
  const sources: Source[] = [];

  // ── Reddit subreddit feeds ────────────────────────────────────────────────
  const redditSubs = [
    { sub: "forhire",       label: "r/forhire" },
    { sub: "hiring",        label: "r/hiring" },
    { sub: "slavelabour",   label: "r/slavelabour" },
    { sub: "jobbit",        label: "r/jobbit" },
    { sub: "entrepreneur",  label: "r/entrepreneur" },
    { sub: "smallbusiness", label: "r/smallbusiness" },
  ];
  for (const { sub, label } of redditSubs) {
    sources.push({
      url: `https://www.reddit.com/r/${sub}/.rss?limit=100`,
      city: "reddit",
      cityLabel: "Reddit",
      category: label,
      broadCapture: false,
    });
  }

  // ── Reddit keyword search feeds ───────────────────────────────────────────
  const redditTerms = [
    "website+design", "web+developer", "app+developer", "mobile+app",
    "wordpress+developer", "shopify+developer", "react+developer",
    "flutter+developer", "android+app", "ios+app", "landing+page",
    "logo+design", "seo+help", "web+design", "need+website",
    "apk+developer", "build+app", "ecommerce+developer",
  ];
  for (const term of redditTerms) {
    sources.push({
      url: `https://www.reddit.com/r/forhire+hiring+jobbit+slavelabour/search.rss?q=${term}&restrict_sr=1&sort=new&limit=50`,
      city: "reddit",
      cityLabel: "Reddit",
      category: `Search: ${term.replace(/\+/g, " ")}`,
      broadCapture: false,
    });
  }

  // ── WeWorkRemotely ────────────────────────────────────────────────────────
  const wwrFeeds = [
    { path: "remote-full-stack-programming-jobs",  label: "WWR: Full Stack" },
    { path: "remote-front-end-programming-jobs",   label: "WWR: Front End" },
    { path: "remote-back-end-programming-jobs",    label: "WWR: Back End" },
    { path: "remote-mobile-programming-jobs",      label: "WWR: Mobile / APK" },
    { path: "remote-design-jobs",                  label: "WWR: Design" },
    { path: "remote-marketing-jobs",               label: "WWR: Marketing" },
    { path: "remote-devops-sysadmin-jobs",         label: "WWR: DevOps" },
    { path: "remote-all-other-remote-jobs",        label: "WWR: Other" },
  ];
  for (const { path, label } of wwrFeeds) {
    sources.push({
      url: `https://weworkremotely.com/categories/${path}.rss`,
      city: "weworkremotely",
      cityLabel: "WeWorkRemotely",
      category: label,
      broadCapture: true,
    });
  }

  // ── RemoteOK ──────────────────────────────────────────────────────────────
  const remoteokFeeds = [
    { path: "remote-dev-jobs",    label: "RemoteOK: Dev" },
    { path: "remote-design-jobs", label: "RemoteOK: Design" },
    { path: "remote-jobs",        label: "RemoteOK: All" },
  ];
  for (const { path, label } of remoteokFeeds) {
    sources.push({
      url: `https://remoteok.com/${path}.rss`,
      city: "remoteok",
      cityLabel: "RemoteOK",
      category: label,
      broadCapture: false,
    });
  }

  return sources;
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// ── Main export ───────────────────────────────────────────────────────────────
export async function fetchAllFeeds(): Promise<{ newCount: number; citiesChecked: number }> {
  let newCount = 0;
  const activeSources = new Set<string>();
  const sources = buildSources();
  const now = new Date().toISOString();

  for (const source of sources) {
    const items = await fetchXML(source.url);
    if (items.length > 0) activeSources.add(source.city);

    for (const raw of items) {
      const item = normalizeItem(raw);
      if (!item) continue;

      const matched = scoreKeywords(item.title + " " + item.description);
      if (!source.broadCapture && matched.length === 0) continue;

      const finalKeywords = matched.length > 0 ? matched : [source.category.toLowerCase()];

      const result = storage.upsertLead({
        guid: item.guid,
        title: item.title,
        description: item.description,
        url: item.link,
        city: source.city,
        cityLabel: source.cityLabel,
        category: source.category,
        keywords: JSON.stringify(finalKeywords.slice(0, 8)),
        postedAt: new Date(item.pubDate).toISOString(),
        fetchedAt: now,
        isRead: false,
        isSaved: false,
        isContacted: false,
      });

      if (result) newCount++;
    }

    await sleep(250);
  }

  return { newCount, citiesChecked: activeSources.size };
}
