import { describe, it, expect } from "vitest";
import { scoreLead } from "./storage";

describe("scoreLead", () => {
  it("returns base score of 3 for neutral text with no signals", () => {
    const result = scoreLead("Foo bar baz qux", "", []);
    expect(result).toBe(3);
  });

  it("adds up to +3 for matched keywords", () => {
    const result = scoreLead("Foo bar", "", ["website", "web design", "shopify"]);
    expect(result).toBe(6); // 3 base + 3 keywords (capped)
  });

  it("adds up to +3 for hot signals and +1 for warm signal", () => {
    const result = scoreLead("Urgent need now, budget available", "", []);
    expect(result).toBe(7); // 3 base + 3 hot (urgent+need now+budget) + 1 warm (need)
  });

  it("adds +1 for warm signal and +1 for high-value keyword", () => {
    const result = scoreLead("Need shopify developer", "", []);
    expect(result).toBe(5); // 3 base + 1 warm ('need') + 1 high-value ('shopify')
  });

  it("adds +1 for description longer than 50 chars", () => {
    const result = scoreLead(
      "Foo bar",
      "A very long description that exceeds fifty characters in total length for bonus point",
      [],
    );
    expect(result).toBe(4); // 3 base + 1 long description
  });
});
