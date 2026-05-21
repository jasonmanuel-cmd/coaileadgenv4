import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer, type Server } from "node:http";
import express from "express";
import { registerRoutes } from "./routes";

// Set temp database path BEFORE storage module imports
process.env.DATABASE_PATH = ":memory:";

const app = express();
let server: Server;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

beforeAll(async () => {
  await registerRoutes(server!, app);
  server = createServer(app);
  server.listen(0); // random port
});

afterAll(() => {
  server?.close();
});

function getUrl(path: string) {
  const addr = server?.address();
  if (!addr || typeof addr === "string") return `http://localhost:0${path}`;
  return `http://127.0.0.1:${addr.port}${path}`;
}

describe("GET /api/leads", () => {
  it("returns 200 with leads and total", async () => {
    const res = await fetch(getUrl("/api/leads"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("leads");
    expect(body).toHaveProperty("total");
    expect(Array.isArray(body.leads)).toBe(true);
  });

  it("filters by city when provided", async () => {
    const res = await fetch(getUrl("/api/leads?city=losangeles"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.leads)).toBe(true);
  });

  it("filters by keyword when provided", async () => {
    const res = await fetch(getUrl("/api/leads?keyword=website"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("leads");
  });
});

describe("GET /api/stats", () => {
  it("returns stats object", async () => {
    const res = await fetch(getUrl("/api/stats"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("total");
    expect(body).toHaveProperty("unread");
    expect(body).toHaveProperty("isFetching");
  });
});

describe("GET /api/cities", () => {
  it("returns city list as array", async () => {
    const res = await fetch(getUrl("/api/cities"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });
});
