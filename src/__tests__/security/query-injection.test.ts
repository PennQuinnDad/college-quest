import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockServiceFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: () => ({
    from: (...args: unknown[]) => mockServiceFrom(...args),
  }),
}));

vi.mock("@/lib/admin-auth", () => ({
  verifyAdmin: vi.fn().mockResolvedValue(null), // bypass admin check
}));

function chain(result: { data?: unknown; error?: unknown; count?: number | null }) {
  const c: Record<string, unknown> = {};
  const methods = [
    "select", "insert", "update", "delete",
    "eq", "neq", "in", "or", "not",
    "gte", "lte", "ilike",
    "order", "limit", "range", "filter",
  ];
  for (const m of methods) {
    c[m] = vi.fn((..._args: unknown[]) => c);
  }
  c.single = vi.fn().mockResolvedValue(result);
  c.maybeSingle = vi.fn().mockResolvedValue(result);
  c.then = (resolve: (v: unknown) => void) => resolve(result);
  return c;
}

// ── /api/colleges injection tests ──────────────────────────────────────────────

describe("Query injection prevention - /api/colleges", () => {
  let GET: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/colleges/route");
    GET = mod.GET;
  });

  it("strips PostgREST special characters from search query", async () => {
    const qb = chain({ data: [], error: null, count: 0 });
    mockServiceFrom.mockReturnValue(qb);

    // Attempt injection: commas and dots are PostgREST operators
    const malicious = "test,name.eq.admin";
    const url = new URL("http://localhost/api/colleges");
    url.searchParams.set("query", malicious);

    await GET(new NextRequest(url));

    // or() should be called with sanitized value (no commas/dots from user input)
    expect(qb.or).toHaveBeenCalled();
    const orArg = (qb.or as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    // The malicious dots and commas should be stripped — only our template commas/dots remain
    expect(orArg).not.toContain("name.eq.admin");
    expect(orArg).toContain("name.ilike.%testnameeqadmin%");
  });

  it("strips parentheses from search query", async () => {
    const qb = chain({ data: [], error: null, count: 0 });
    mockServiceFrom.mockReturnValue(qb);

    const malicious = "test(or.id.eq.1)";
    const url = new URL("http://localhost/api/colleges");
    url.searchParams.set("query", malicious);

    await GET(new NextRequest(url));

    expect(qb.or).toHaveBeenCalled();
    const orArg = (qb.or as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(orArg).not.toContain("(or");
    expect(orArg).toContain("testorideq1");
  });

  it("strips percent and underscore wildcards from search query", async () => {
    const qb = chain({ data: [], error: null, count: 0 });
    mockServiceFrom.mockReturnValue(qb);

    const malicious = "%admin%_secret";
    const url = new URL("http://localhost/api/colleges");
    url.searchParams.set("query", malicious);

    await GET(new NextRequest(url));

    expect(qb.or).toHaveBeenCalled();
    const orArg = (qb.or as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    // User-supplied % and _ should be stripped; only our wrapping %...% remains
    expect(orArg).toContain("name.ilike.%adminsecret%");
  });

  it("skips filter entirely when query sanitizes to empty string", async () => {
    const qb = chain({ data: [], error: null, count: 0 });
    mockServiceFrom.mockReturnValue(qb);

    // Only special characters — sanitizes to empty
    const malicious = ".,()\\/%_";
    const url = new URL("http://localhost/api/colleges");
    url.searchParams.set("query", malicious);

    await GET(new NextRequest(url));

    // or() should NOT be called since sanitized value is empty
    expect(qb.or).not.toHaveBeenCalled();
  });

  it("allows normal alphanumeric search terms through", async () => {
    const qb = chain({ data: [], error: null, count: 0 });
    mockServiceFrom.mockReturnValue(qb);

    const url = new URL("http://localhost/api/colleges");
    url.searchParams.set("query", "Harvard University");

    await GET(new NextRequest(url));

    expect(qb.or).toHaveBeenCalled();
    const orArg = (qb.or as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(orArg).toContain("name.ilike.%Harvard University%");
  });
});

// ── /api/colleges/autocomplete injection tests ────────────────────────────────

describe("Query injection prevention - /api/colleges/autocomplete", () => {
  let GET: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/colleges/autocomplete/route");
    GET = mod.GET;
  });

  it("strips injection characters from autocomplete query", async () => {
    const qb = chain({ data: [], error: null });
    mockServiceFrom.mockReturnValue(qb);

    const url = new URL("http://localhost/api/colleges/autocomplete");
    url.searchParams.set("query", "test.or(1=1)");

    await GET(new NextRequest(url));

    expect(qb.ilike).toHaveBeenCalled();
    const ilikeArg = (qb.ilike as ReturnType<typeof vi.fn>).mock.calls[0][1] as string;
    expect(ilikeArg).not.toContain("or(1=1)");
    expect(ilikeArg).toBe("%testor1=1%");
  });

  it("returns empty array when sanitized query is too short", async () => {
    const url = new URL("http://localhost/api/colleges/autocomplete");
    url.searchParams.set("query", ".("); // sanitizes to empty

    const res = await GET(new NextRequest(url));
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it("allows normal autocomplete queries through", async () => {
    const qb = chain({ data: [{ id: "c-1", name: "MIT" }], error: null });
    mockServiceFrom.mockReturnValue(qb);

    const url = new URL("http://localhost/api/colleges/autocomplete");
    url.searchParams.set("query", "MIT");

    const res = await GET(new NextRequest(url));
    expect(res.status).toBe(200);
    expect(qb.ilike).toHaveBeenCalledWith("name", "%MIT%");
  });
});

// ── /api/admin/colleges injection tests ───────────────────────────────────────

describe("Query injection prevention - /api/admin/colleges", () => {
  let GET: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/admin/colleges/route");
    GET = mod.GET;
  });

  it("strips PostgREST special characters from admin search", async () => {
    const qb = chain({ data: [], error: null, count: 0 });
    mockServiceFrom.mockReturnValue(qb);

    const url = new URL("http://localhost/api/admin/colleges");
    url.searchParams.set("query", "inject,name.eq.secret");

    await GET(new NextRequest(url));

    expect(qb.or).toHaveBeenCalled();
    const orArg = (qb.or as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(orArg).not.toContain("name.eq.secret");
    expect(orArg).toContain("name.ilike.%injectnameeqsecret%");
  });

  it("skips .or() when admin query sanitizes to empty", async () => {
    const qb = chain({ data: [], error: null, count: 0 });
    mockServiceFrom.mockReturnValue(qb);

    const url = new URL("http://localhost/api/admin/colleges");
    url.searchParams.set("query", ".,()/\\%_");

    await GET(new NextRequest(url));

    expect(qb.or).not.toHaveBeenCalled();
  });
});
