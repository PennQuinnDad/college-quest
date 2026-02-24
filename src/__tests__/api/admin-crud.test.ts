import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockServiceFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: () =>
        Promise.resolve({ data: { user: { id: "admin-1" } } }),
    },
  }),
  createServiceClient: () => ({
    from: (...args: unknown[]) => mockServiceFrom(...args),
  }),
}));

// verifyAdmin always passes in these tests — we test auth separately
vi.mock("@/lib/admin-auth", () => ({
  verifyAdmin: vi.fn().mockResolvedValue(null),
}));

function chain(result: { data?: unknown; error?: unknown; count?: number | null }) {
  const c: Record<string, unknown> = {};
  const methods = [
    "select", "insert", "update", "delete",
    "eq", "neq", "in", "or", "not",
    "ilike", "order", "limit", "range",
  ];
  for (const m of methods) {
    c[m] = vi.fn().mockReturnValue(c);
  }
  c.single = vi.fn().mockResolvedValue(result);
  c.maybeSingle = vi.fn().mockResolvedValue(result);
  c.then = (resolve: (v: unknown) => void) => resolve(result);
  return c;
}

// ── Admin Colleges ──────────────────────────────────────────────────────────

describe("GET /api/admin/colleges", () => {
  let GET: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/admin/colleges/route");
    GET = mod.GET;
  });

  it("returns paginated colleges", async () => {
    mockServiceFrom.mockReturnValue(
      chain({
        data: [{ id: "c-1", name: "MIT" }],
        error: null,
        count: 50,
      }),
    );

    const res = await GET(new NextRequest("http://localhost/api/admin/colleges"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.colleges).toHaveLength(1);
    expect(body.total).toBe(50);
  });

  it("applies search query", async () => {
    const qb = chain({ data: [], error: null, count: 0 });
    mockServiceFrom.mockReturnValue(qb);

    await GET(
      new NextRequest("http://localhost/api/admin/colleges?query=harvard"),
    );

    expect(qb.or).toHaveBeenCalled();
    const orArg = (qb.or as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(orArg).toContain("name.ilike.%harvard%");
  });

  it("sorts by the requested column", async () => {
    const qb = chain({ data: [], error: null, count: 0 });
    mockServiceFrom.mockReturnValue(qb);

    await GET(
      new NextRequest(
        "http://localhost/api/admin/colleges?sortBy=tuition&sortOrder=desc",
      ),
    );

    expect(qb.order).toHaveBeenCalledWith("tuition_in_state", {
      ascending: false,
    });
  });
});

describe("POST /api/admin/colleges", () => {
  let POST: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/admin/colleges/route");
    POST = mod.POST;
  });

  it("returns 400 when required fields missing", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api/admin/colleges", {
        method: "POST",
        body: JSON.stringify({ name: "MIT" }),
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/city.*state|name.*city.*state/i);
  });

  it("returns 201 on successful creation", async () => {
    mockServiceFrom.mockReturnValue(
      chain({
        data: { id: "new-id", name: "MIT", city: "Cambridge", state: "MA" },
        error: null,
      }),
    );

    const res = await POST(
      new NextRequest("http://localhost/api/admin/colleges", {
        method: "POST",
        body: JSON.stringify({ name: "MIT", city: "Cambridge", state: "MA" }),
      }),
    );
    expect(res.status).toBe(201);
  });

  it("maps camelCase to snake_case fields", async () => {
    const qb = chain({ data: { id: "new-id" }, error: null });
    mockServiceFrom.mockReturnValue(qb);

    await POST(
      new NextRequest("http://localhost/api/admin/colleges", {
        method: "POST",
        body: JSON.stringify({
          name: "MIT",
          city: "Cambridge",
          state: "MA",
          tuitionInState: 55000,
          acceptanceRate: 0.04,
          scorecardId: "abc123",
        }),
      }),
    );

    const insertCall = (qb.insert as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(insertCall.tuition_in_state).toBe(55000);
    expect(insertCall.acceptance_rate).toBe(0.04);
    expect(insertCall.scorecard_id).toBe("abc123");
  });
});

describe("DELETE /api/admin/colleges", () => {
  let DELETE: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/admin/colleges/route");
    DELETE = mod.DELETE;
  });

  it("returns 400 when ids is missing", async () => {
    const res = await DELETE(
      new NextRequest("http://localhost/api/admin/colleges", {
        method: "DELETE",
        body: JSON.stringify({}),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when ids is empty array", async () => {
    const res = await DELETE(
      new NextRequest("http://localhost/api/admin/colleges", {
        method: "DELETE",
        body: JSON.stringify({ ids: [] }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns count of deleted colleges", async () => {
    mockServiceFrom.mockReturnValue(
      chain({ data: null, error: null, count: 3 }),
    );

    const res = await DELETE(
      new NextRequest("http://localhost/api/admin/colleges", {
        method: "DELETE",
        body: JSON.stringify({ ids: ["c-1", "c-2", "c-3"] }),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.deleted).toBe(3);
  });
});

// ── Admin Schools ───────────────────────────────────────────────────────────

describe("GET /api/admin/schools", () => {
  let GET: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/admin/schools/route");
    GET = mod.GET;
  });

  it("returns all schools", async () => {
    mockServiceFrom.mockReturnValue(
      chain({
        data: [{ id: "s-1", name: "School of Engineering" }],
        error: null,
      }),
    );

    const res = await GET(
      new NextRequest("http://localhost/api/admin/schools"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
  });
});

describe("POST /api/admin/schools", () => {
  let POST: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/admin/schools/route");
    POST = mod.POST;
  });

  it("returns 400 when name is missing", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api/admin/schools", {
        method: "POST",
        body: JSON.stringify({ collegeId: "c-1" }),
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/name.*collegeId/i);
  });

  it("returns 400 when collegeId is missing", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api/admin/schools", {
        method: "POST",
        body: JSON.stringify({ name: "School of Eng" }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 201 on successful creation", async () => {
    mockServiceFrom.mockReturnValue(
      chain({ data: { id: "s-new", name: "School of Eng" }, error: null }),
    );

    const res = await POST(
      new NextRequest("http://localhost/api/admin/schools", {
        method: "POST",
        body: JSON.stringify({ name: "School of Eng", collegeId: "c-1" }),
      }),
    );
    expect(res.status).toBe(201);
  });

  it("sets source to manual by default", async () => {
    const qb = chain({ data: { id: "s-new" }, error: null });
    mockServiceFrom.mockReturnValue(qb);

    await POST(
      new NextRequest("http://localhost/api/admin/schools", {
        method: "POST",
        body: JSON.stringify({ name: "Test", collegeId: "c-1" }),
      }),
    );

    const insertCall = (qb.insert as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(insertCall.source).toBe("manual");
  });
});

// ── Admin Profiles ──────────────────────────────────────────────────────────

describe("GET /api/admin/profiles", () => {
  let GET: () => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/admin/profiles/route");
    GET = mod.GET;
  });

  it("returns all profiles ordered by email", async () => {
    const qb = chain({
      data: [
        { id: "u-1", email: "alice@test.com" },
        { id: "u-2", email: "bob@test.com" },
      ],
      error: null,
    });
    mockServiceFrom.mockReturnValue(qb);

    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toHaveLength(2);
    expect(qb.order).toHaveBeenCalledWith("email", { ascending: true });
  });
});
