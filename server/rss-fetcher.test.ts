import { describe, it, expect } from "vitest";
import { normalizeItem } from "./rss-fetcher";

describe("normalizeItem", () => {
  it("parses a standard RSS item", () => {
    const item = {
      title: ["Frontend Developer Needed"],
      link: ["https://example.com/job/123"],
      description: ["<p>We need a React developer for our startup.</p>"],
      pubDate: ["2025-01-15T10:00:00Z"],
      guid: ["job-123"],
    };
    const result = normalizeItem(item);
    expect(result).toEqual({
      title: "Frontend Developer Needed",
      link: "https://example.com/job/123",
      description: "We need a React developer for our startup.",
      pubDate: "2025-01-15T10:00:00Z",
      guid: "job-123",
    });
  });

  it("parses an Atom feed item", () => {
    const item = {
      title: ["Backend Engineer Wanted"],
      link: [{ $: { href: "https://example.com/atom/456" } }],
      published: ["2025-02-01T08:00:00Z"],
      id: ["atom-456"],
    };
    const result = normalizeItem(item);
    expect(result).toEqual({
      title: "Backend Engineer Wanted",
      link: "https://example.com/atom/456",
      description: "",
      pubDate: "2025-02-01T08:00:00Z",
      guid: "atom-456",
    });
  });

  it("returns null for item with no link", () => {
    const item = {
      title: ["Title only"],
      link: [""],
      description: [""],
      pubDate: [""],
    };
    const result = normalizeItem(item);
    expect(result).toBeNull();
  });

  it("returns null for item with no title", () => {
    const item = {
      title: [""],
      link: ["https://example.com/no-title"],
      description: [""],
      pubDate: [""],
    };
    const result = normalizeItem(item);
    expect(result).toBeNull();
  });

  it("strips HTML tags from description", () => {
    const item = {
      title: ["Job with HTML"],
      link: ["https://example.com/html-job"],
      description: ["<div><strong>Urgent</strong> need <em>developer</em> now</div>"],
      pubDate: ["2025-03-01T12:00:00Z"],
      guid: ["html-job"],
    };
    const result = normalizeItem(item);
    expect(result!.description).toBe("Urgent need developer now");
  });

  it("handles item with no guid by falling back to link", () => {
    const item = {
      title: ["No GUID"],
      link: ["https://example.com/no-guid"],
      description: [""],
      pubDate: ["2025-04-01T00:00:00Z"],
    };
    const result = normalizeItem(item);
    expect(result!.guid).toBe("https://example.com/no-guid");
  });
});
