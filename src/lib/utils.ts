import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | null): string {
  if (value == null) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number | null): string {
  if (value == null) return "N/A";
  return `${value.toFixed(1)}%`;
}

export function formatNumber(value: number | null): string {
  if (value == null) return "N/A";
  return new Intl.NumberFormat("en-US").format(value);
}

/**
 * Sanitize user input for use in PostgREST filter strings (.or(), .ilike(), etc.).
 * Strips characters that have special meaning in PostgREST filter syntax.
 */
export function sanitizeFilterValue(value: string): string {
  return value.replace(/[,.()\\\/%_]/g, "");
}

/**
 * Returns a safe href for user-supplied URLs.
 * Only allows http:// and https:// protocols to prevent javascript: XSS.
 */
export function safeHref(url: string | null | undefined): string {
  if (!url) return "#";
  const trimmed = url.trim();
  if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) {
    return trimmed;
  }
  // Block any scheme (javascript:, data:, vbscript:, ftp:, etc.)
  // A scheme is letters followed by a colon at the start of the string
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    return "#";
  }
  // No protocol — assume https for bare domains
  return `https://${trimmed}`;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates that a string is a valid UUID v4 format.
 * Use this to validate user-supplied IDs before using them in queries.
 */
export function isValidUUID(value: string): boolean {
  return UUID_RE.test(value);
}

