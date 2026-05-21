import { describe, it, expect } from "vitest";

// Set temp database path BEFORE storage module loads
process.env.DATABASE_PATH = ":memory:";

// Dynamic import so env var is set first
const { storage } = await import("./storage");

describe("storage", () => {
  const sampleLead = {
    guid: "test-guid-001",
    title: "Need website for bakery",
    description: "Looking for someone to build a WordPress site for our bakery",
    url: "https://example.com/post/1",
    city: "losangeles",
    cityLabel: "Los Angeles, CA",
    category: "test",
    keywords: JSON.stringify(["website", "wordpress"]),
    postedAt: new Date().toISOString(),
    fetchedAt: new Date().toISOString(),
    isRead: false,
    isSaved: false,
    isContacted: false,
  };

  it("inserts a lead and returns it with an id and score", () => {
    const result = storage.upsertLead(sampleLead);
    expect(result).toBeDefined();
    expect(result!.id).toBeGreaterThan(0);
    expect(result!.title).toBe("Need website for bakery");
    expect(result!.score).toBeGreaterThanOrEqual(1);
    expect(result!.guid).toBe("test-guid-001");
  });

  it("returns undefined for a duplicate guid (dedup)", () => {
    const dup = storage.upsertLead(sampleLead);
    expect(dup).toBeUndefined();
  });

  it("returns the inserted lead via getLead", () => {
    const lead = storage.getLead(1);
    expect(lead).toBeDefined();
    expect(lead!.title).toBe("Need website for bakery");
  });

  it("returns leads via getLeads", () => {
    const { leads: results, total } = storage.getLeads({});
    expect(total).toBeGreaterThanOrEqual(1);
    expect(results.some((l) => l.guid === "test-guid-001")).toBe(true);
  });

  it("updates a lead", () => {
    const updated = storage.updateLead(1, { isRead: true });
    expect(updated).toBeDefined();
    expect(updated!.isRead).toBe(true);
  });

  it("deletes a lead", () => {
    storage.deleteLead(1);
    const lead = storage.getLead(1);
    expect(lead).toBeUndefined();
  });
});
