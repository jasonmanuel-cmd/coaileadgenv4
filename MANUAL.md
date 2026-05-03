# COAI Lead Monitor — User Manual

## What This Does

Scans the internet for people who need websites, apps, logos, SEO, and digital
services — automatically. Pulls from Craigslist (real browser), Reddit, Thumbtack,
Nextdoor, Oodle, WeWorkRemotely, and RemoteOK. Results show up in a live dashboard
so you can contact leads before anyone else does.

---

## Starting the App

### Step 1 — Open PowerShell in the right folder

1. Open **File Explorer**
2. Navigate to: `C:\Users\blunt\Desktop\coai-lead-monitor`
3. Click the **address bar** at the top, type `powershell`, press **Enter**
4. A black PowerShell window opens already inside the folder

### Step 2 — Start the server

Type this exactly and press **Enter**:

```
npx tsx server/index.ts
```

Wait a few seconds. You will see:

```
[express] serving on port 5000
```

That means it is running. **Do not close this window** — closing it stops the app.

### Step 3 — Open the dashboard

Open your browser (Chrome, Edge, etc.) and go to:

```
http://localhost:5000
```

The COAI Lead Monitor dashboard loads. You are ready to go.

---

## Scanning for Leads

Click **Scan Now** in the top right of the dashboard.

- The button will say **Scanning...** while it works
- **Reddit, WeWorkRemotely, RemoteOK** finish in about 30 seconds
- **Craigslist, Thumbtack, Nextdoor, Oodle** take 5–10 minutes (real browser)
- A green banner at the top shows how many new leads were found
- Only leads from the **last 48 hours** are kept — old ones are filtered out automatically

---

## Reading the Dashboard

### Left sidebar — Stats

| Number | Meaning |
|--------|---------|
| Total | All leads in your database |
| Unread | Leads you have not opened yet |
| Saved | Leads you bookmarked |
| Contacted | Leads you already reached out to |

### Left sidebar — Filters

- **All Leads** — shows everything
- **Unread** — new leads you haven't looked at
- **Saved** — your bookmarked leads
- **Contacted** — who you already reached out to

### Left sidebar — Sources

Click any source name to see only leads from that place:
Reddit, WeWorkRemotely, RemoteOK, Thumbtack, Nextdoor, Oodle, or any Craigslist city.

### Search bar (top right)

Type any word to filter leads instantly.
Examples: `shopify` `logo` `app` `wordpress` `bakersfield` `flutter`

---

## Lead Score

Every lead gets a score from **1 to 10** showing how good the opportunity is.

| Score | Meaning |
|-------|---------|
| 8–10 | Hot — person is ready to buy, says things like "need ASAP" or "have budget" |
| 5–7 | Warm — clear need for your service, worth reaching out |
| 1–4 | Cold — vague or possibly not relevant |

Higher keyword matches + stronger buying signals = higher score.

---

## Working a Lead

Each lead card has action buttons on the right side:

| Button | What it does |
|--------|-------------|
| Arrow | Opens the original post in a new tab |
| Bookmark | Saves the lead so you can find it later |
| Checkmark | Marks as contacted |
| Eye | Marks as read / unread |
| Trash | Deletes the lead |

**Recommended workflow:**
1. Filter by **Unread**
2. Sort by score — work highest scores first
3. Click the arrow to read the post
4. Bookmark it if it looks good
5. Reach out to the person
6. Click the checkmark when done

---

## Stopping the App

Go to the PowerShell window and press **Ctrl + C**.
The server stops. Your leads are saved and will be there next time.

---

## Starting Again After You Restart Your Computer

Every time you restart Windows you need to start the server again.
Repeat Step 1 and Step 2 above. Your old leads will still be there.

---

## Sources It Scans

| Source | What it finds |
|--------|---------------|
| **Craigslist** | 20 US cities — computer gigs, web design, creative, marketing, business services |
| **Reddit r/forhire** | Freelance hiring posts |
| **Reddit r/hiring** | Contract and freelance job posts |
| **Reddit Search** | 18 keyword searches — "app developer", "need website", "shopify", "flutter", "apk" and more |
| **WeWorkRemotely** | Remote jobs — full stack, frontend, backend, mobile, design, marketing |
| **RemoteOK** | Remote dev and design jobs |
| **Thumbtack** | People requesting web design, app dev, SEO, logo, graphic design |
| **Nextdoor** | Local service requests near you |
| **Oodle** | Local classifieds — web and app related posts |

---

## Troubleshooting

**"Port already in use" error**
Another copy is running. Open Task Manager → find `node.exe` → End Task → start again.

**"Cannot find module" error**
Run this first, then start again:
```
npm install
```

**Dashboard shows 0 leads**
Click Scan Now and wait 10 minutes for the full browser scrape to finish.

**No new leads coming in**
Some sites temporarily block scrapers. Wait an hour and scan again.
Reddit and WeWorkRemotely almost never block so you will always get something.

**PowerShell closed by accident**
Just open it again and run `npx tsx server/index.ts` — your leads are still saved.

---

## Quick Reference Card

```
START    Open PowerShell in: C:\Users\blunt\Desktop\coai-lead-monitor
         Type:               npx tsx server/index.ts
         Open browser:       http://localhost:5000

SCAN     Click "Scan Now" — wait 5-10 min for full results

STOP     Press Ctrl+C in the PowerShell window

FILTER   Sidebar: filter by source, city, or status
         Search bar: find specific keywords

SCORE    8-10 = hot lead  |  5-7 = warm  |  1-4 = cold
```
