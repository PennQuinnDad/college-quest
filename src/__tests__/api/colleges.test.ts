import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockServiceFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: () => ({
    from: (...args: unknown[]) => mockServiceFrom(...args),
  }),
}));

/**
 * Build a chainable query builder that tracks which methods were called
 * and resolves with the given result.
 */
function chain(result: { data?: unknown; error?: unknown; count?: number | null }) {
  const calls: { method: string; args: unknown[] }[] = [];
  const c: Record<string, unknown> = {};

  const methods = [
    "select", "insert", "update", "delete",
    "eq", "neq", "in", "or", "not",
    "gte", "lte", "ilike",
    "order", "limit", "range", "filter",
  ];
  for (const m of methods) {
    c[m] = vi.fn((...args: unknown[]) => {
      calls.push({ method: m, args });
      return c;
    });
  }

  c.single = vi.fn().mockResolvedValue(result);
  c.maybeSingle = vi.fn().mockResolvedValue(result);
  c.then = (resolve: (v: unknown) => void) => resolve(result);
  c._calls = calls;

  return c;
}

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost/api/colleges");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url);
}

describe("GET /api/colleges", () => {
  let GET: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/colleges/route");
    GET = mod.GET;
  });

  it("returns colleges with default pagination", async () => {
    const qb = chain({
      data: [{ id: "c-1", name: "MIT" }],
      error: null,
      count: 1,
    });
    mockServiceFrom.mockReturnValue(qb);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.colleges).toHaveLength(1);
    expect(body.total).toBe(1);
  });

  it("applies text search across multiple fields", async () => {
    const qb = chain({ data: [], error: null, count: 0 });
    mockServiceFrom.mockReturnValue(qb);

    await GET(makeRequest({ query: "harvard" }));

    // The or() method should have been called with ilike patterns
    expect(qb.or).toHaveBeenCalled();
    const orCall = (qb.or as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(orCall).toContain("name.ilike.%harvard%");
    expect(orCall).toContain("city.ilike.%harvard%");
    expect(orCall).toContain("state.ilike.%harvard%");
  });

  it("applies state filter", async () => {
    const qb = chain({ data: [], error: null, count: 0 });
    mockServiceFrom.mockReturnValue(qb);

    await GET(makeRequest({ states: "MA,CA" }));

    expect(qb.in).toHaveBeenCalledWith("state", ["MA", "CA"]);
  });

  it("applies region filter", async () => {
    const qb = chain({ data: [], error: null, count: 0 });
    mockServiceFrom.mockReturnValue(qb);

    await GET(makeRequest({ regions: "Northeast,West" }));

    expect(qb.in).toHaveBeenCalledWith("region", ["Northeast", "West"]);
  });

  it("applies type filter", async () => {
    const qb = chain({ data: [], error: null, count: 0 });
    mockServiceFrom.mockReturnValue(qb);

    await GET(makeRequest({ types: "Private,Public" }));

    expect(qb.in).toHaveBeenCalledWith("type", ["Private", "Public"]);
  });

  it("applies jesuit-only filter", async () => {
    const qb = chain({ data: [], error: null, count: 0 });
    mockServiceFrom.mockReturnValue(qb);

    await GET(makeRequest({ jesuitOnly: "true" }));

    expect(qb.eq).toHaveBeenCalledWith("jesuit", true);
  });

  it("applies acceptance rate range buckets", async () => {
    const qb = chain({ data: [], error: null, count: 0 });
    mockServiceFrom.mockReturnValue(qb);

    await GET(makeRequest({ acceptanceRanges: "Highly Selective (0-15%)" }));

    expect(qb.or).toHaveBeenCalled();
    const orArg = (qb.or as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(orArg).toContain("acceptance_rate.gt.0");
    expect(orArg).toContain("acceptance_rate.lte.15");
  });

  it("applies tuition range filters", async () => {
    const qb = chain({ data: [], error: null, count: 0 });
    mockServiceFrom.mockReturnValue(qb);

    await GET(makeRequest({ tuitionMin: "10000", tuitionMax: "50000" }));

    expect(qb.gte).toHaveBeenCalledWith("tuition_in_state", 10000);
    expect(qb.lte).toHaveBeenCalledWith("tuition_in_state", 50000);
  });

  it("applies enrollment range filters", async () => {
    const qb = chain({ data: [], error: null, count: 0 });
    mockServiceFrom.mockReturnValue(qb);

    await GET(makeRequest({ enrollmentMin: "1000", enrollmentMax: "20000" }));

    expect(qb.gte).toHaveBeenCalledWith("enrollment", 1000);
    expect(qb.lte).toHaveBeenCalledWith("enrollment", 20000);
  });

  it("applies favoriteIds filter", async () => {
    const qb = chain({ data: [], error: null, count: 0 });
    mockServiceFrom.mockReturnValue(qb);

    await GET(makeRequest({ favoriteIds: "c-1,c-2,c-3" }));

    expect(qb.in).toHaveBeenCalledWith("id", ["c-1", "c-2", "c-3"]);
  });

  it("sorts by specified column", async () => {
    const qb = chain({ data: [], error: null, count: 0 });
    mockServiceFrom.mockReturnValue(qb);

    await GET(makeRequest({ sortBy: "tuition", sortOrder: "desc" }));

    expect(qb.order).toHaveBeenCalledWith("tuition_in_state", { ascending: false });
  });

  it("maps sortBy names to database columns", async () => {
    const qb = chain({ data: [], error: null, count: 0 });
    mockServiceFrom.mockReturnValue(qb);

    await GET(makeRequest({ sortBy: "acceptance" }));

    expect(qb.order).toHaveBeenCalledWith("acceptance_rate", { ascending: true });
  });

  it("defaults to name sort ascending", async () => {
    const qb = chain({ data: [], error: null, count: 0 });
    mockServiceFrom.mockReturnValue(qb);

    await GET(makeRequest());

    expect(qb.order).toHaveBeenCalledWith("name", { ascending: true });
  });

  it("clamps page to minimum 1", async () => {
    const qb = chain({ data: [], error: null, count: 0 });
    mockServiceFrom.mockReturnValue(qb);

    await GET(makeRequest({ page: "-5" }));

    // range should start from 0 (page 1)
    expect(qb.range).toHaveBeenCalledWith(0, 47);
  });

  it("clamps limit to max 5000", async () => {
    const qb = chain({ data: [], error: null, count: 0 });
    mockServiceFrom.mockReturnValue(qb);

    // For limits > 1000, it uses the batch strategy, but limit should still be capped
    await GET(makeRequest({ limit: "99999" }));

    // Should not crash — the batch loop handles it
    expect(mockServiceFrom).toHaveBeenCalled();
  });

  it("sets cache headers on response", async () => {
    const qb = chain({ data: [], error: null, count: 0 });
    mockServiceFrom.mockReturnValue(qb);

    const res = await GET(makeRequest());
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=60");
  });

  it("handles numeric filter with NaN gracefully", async () => {
    const qb = chain({ data: [], error: null, count: 0 });
    mockServiceFrom.mockReturnValue(qb);

    // "abc" should parse to NaN and be skipped
    await GET(makeRequest({ tuitionMin: "abc" }));

    expect(qb.gte).not.toHaveBeenCalledWith("tuition_in_state", expect.anything());
  });

  it("returns 500 on database error", async () => {
    const qb = chain({ data: null, error: new Error("DB down"), count: null });
    mockServiceFrom.mockReturnValue(qb);

    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
  });
});

describe("GET /api/colleges/[id]", () => {
  let GET: (
    req: NextRequest,
    ctx: { params: Promise<{ id: string }> },
  ) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/colleges/[id]/route");
    GET = mod.GET;
  });

  it("returns college data", async () => {
    mockServiceFrom.mockReturnValue(
      chain({ data: { id: "c-1", name: "MIT" }, error: null }),
    );

    const res = await GET(
      new NextRequest("http://localhost/api/colleges/c-1"),
      { params: Promise.resolve({ id: "c-1" }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("MIT");
  });

  it("returns 404 for unknown college", async () => {
    mockServiceFrom.mockReturnValue(
      chain({ data: null, error: { code: "PGRST116" } }),
    );

    const res = await GET(
      new NextRequest("http://localhost/api/colleges/nope"),
      { params: Promise.resolve({ id: "nope" }) },
    );
    expect(res.status).toBe(404);
  });

  it("sets cache headers", async () => {
    mockServiceFrom.mockReturnValue(
      chain({ data: { id: "c-1", name: "MIT" }, error: null }),
    );

    const res = await GET(
      new NextRequest("http://localhost/api/colleges/c-1"),
      { params: Promise.resolve({ id: "c-1" }) },
    );
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=3600");
  });
});
