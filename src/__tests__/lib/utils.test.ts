import { describe, it, expect } from "vitest";
import { formatCurrency, formatPercent, formatNumber, cn, sanitizeFilterValue, safeHref } from "@/lib/utils";

describe("formatCurrency", () => {
  it("returns N/A for null", () => {
    expect(formatCurrency(null)).toBe("N/A");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("$0");
  });

  it("formats thousands with commas and no decimals", () => {
    expect(formatCurrency(45000)).toBe("$45,000");
  });

  it("rounds to whole dollars", () => {
    expect(formatCurrency(12345.67)).toBe("$12,346");
  });

  it("formats large numbers", () => {
    expect(formatCurrency(1234567)).toBe("$1,234,567");
  });
});

describe("formatPercent", () => {
  it("returns N/A for null", () => {
    expect(formatPercent(null)).toBe("N/A");
  });

  it("formats whole number with one decimal", () => {
    expect(formatPercent(50)).toBe("50.0%");
  });

  it("rounds to one decimal place", () => {
    expect(formatPercent(82.456)).toBe("82.5%");
  });

  it("formats zero", () => {
    expect(formatPercent(0)).toBe("0.0%");
  });

  it("formats 100", () => {
    expect(formatPercent(100)).toBe("100.0%");
  });
});

describe("formatNumber", () => {
  it("returns N/A for null", () => {
    expect(formatNumber(null)).toBe("N/A");
  });

  it("formats thousands with commas", () => {
    expect(formatNumber(12345)).toBe("12,345");
  });

  it("formats zero", () => {
    expect(formatNumber(0)).toBe("0");
  });

  it("formats small numbers without commas", () => {
    expect(formatNumber(999)).toBe("999");
  });

  it("formats large numbers", () => {
    expect(formatNumber(1000000)).toBe("1,000,000");
  });
});

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", "visible")).toBe("base visible");
  });

  it("merges conflicting tailwind classes (last wins)", () => {
    expect(cn("p-4", "p-2")).toBe("p-2");
  });

  it("handles empty input", () => {
    expect(cn()).toBe("");
  });
});

describe("sanitizeFilterValue", () => {
  it("strips commas", () => {
    expect(sanitizeFilterValue("a,b")).toBe("ab");
  });

  it("strips dots", () => {
    expect(sanitizeFilterValue("name.eq.1")).toBe("nameeq1");
  });

  it("strips parentheses", () => {
    expect(sanitizeFilterValue("or(id)")).toBe("orid");
  });

  it("strips backslashes, percent, underscore, forward slash", () => {
    expect(sanitizeFilterValue("a\\b%c_d/e")).toBe("abcde");
  });

  it("preserves normal alphanumeric and spaces", () => {
    expect(sanitizeFilterValue("Harvard University")).toBe("Harvard University");
  });

  it("returns empty for all-special input", () => {
    expect(sanitizeFilterValue(".,()\\/%_")).toBe("");
  });
});

describe("safeHref", () => {
  it("returns # for null", () => {
    expect(safeHref(null)).toBe("#");
  });

  it("returns # for undefined", () => {
    expect(safeHref(undefined)).toBe("#");
  });

  it("returns # for empty string", () => {
    expect(safeHref("")).toBe("#");
  });

  it("passes through https URLs", () => {
    expect(safeHref("https://example.com")).toBe("https://example.com");
  });

  it("passes through http URLs", () => {
    expect(safeHref("http://example.com")).toBe("http://example.com");
  });

  it("adds https:// to bare domains", () => {
    expect(safeHref("example.com")).toBe("https://example.com");
  });

  it("blocks javascript: URLs", () => {
    expect(safeHref("javascript:alert(1)")).toBe("#");
  });

  it("blocks data: URLs", () => {
    expect(safeHref("data:text/html,<script>alert(1)</script>")).toBe("#");
  });

  it("blocks vbscript: URLs", () => {
    expect(safeHref("vbscript:MsgBox")).toBe("#");
  });

  it("trims whitespace", () => {
    expect(safeHref("  https://example.com  ")).toBe("https://example.com");
  });
});
