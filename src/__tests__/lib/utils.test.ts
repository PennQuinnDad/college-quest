import { describe, it, expect } from "vitest";
import { formatCurrency, formatPercent, formatNumber, cn } from "@/lib/utils";

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
