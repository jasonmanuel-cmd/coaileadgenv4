# Database Schema Reference

_Source: `shared/schema.ts` (Drizzle ORM + SQLite via better-sqlite3)_

## Tables

### leads

| Column       | Type           | Nullable | Default        | Notes                                 |
| ------------ | -------------- | -------- | -------------- | ------------------------------------- |
| id           | integer        | NO       | auto-increment | PK                                    |
| guid         | text           | NO       | -              | Unique, dedup key from source         |
| title        | text           | NO       | -              | Listing headline                      |
| description  | text           | YES      | -              | Full body text                        |
| url          | text           | NO       | -              | Link to original listing              |
| city         | text           | NO       | -              | City key (e.g. "newyork")             |
| city_label   | text           | NO       | -              | Display name (e.g. "New York")        |
| category     | text           | NO       | -              | Source category string                |
| keywords     | text           | NO       | -              | JSON array of matched keywords        |
| posted_at    | text           | NO       | -              | ISO 8601 string                       |
| fetched_at   | text           | NO       | -              | ISO 8601 (when discovered)            |
| is_read      | integer (bool) | YES      | false          | 0/1                                   |
| is_saved     | integer (bool) | YES      | false          | 0/1                                   |
| is_contacted | integer (bool) | YES      | false          | 0/1                                   |
| score        | integer        | YES      | 5              | Computed from keyword count + signals |

### feed_stats

| Column          | Type    | Nullable | Default        | Notes                   |
| --------------- | ------- | -------- | -------------- | ----------------------- |
| id              | integer | NO       | auto-increment | PK                      |
| last_fetched_at | text    | YES      | -              | ISO 8601 of last scan   |
| total_leads     | integer | YES      | 0              | Cumulative lead count   |
| new_leads       | integer | YES      | 0              | Leads from last scan    |
| cities_checked  | integer | YES      | 0              | Cities scanned last run |

## Generated Types

```typescript
import { leads, feedStats } from "shared/schema";

// Row types
export type Lead = typeof leads.$inferSelect;
export type FeedStats = typeof feedStats.$inferSelect;

// Insert types
import { insertLeadSchema } from "shared/schema";
export type InsertLead = z.infer<typeof insertLeadSchema>;
```

## Key Patterns

- **Snake case in SQLite** (`posted_at`), **camelCase in JS** (`postedAt`) via Drizzle column aliasing.
- **Text dates**: SQLite has no native datetime; stored as ISO 8601 strings.
- **Keywords stored as JSON string** — parse with `JSON.parse()` on read.
- **48-hour purge**: Leads older than 48h deleted on every scan (see `server/storage.ts:purgeOldLeads`).
- **Scoring**: `scoreLead()` in `server/storage.ts` — based on keyword match count + buying-signal heuristics.
