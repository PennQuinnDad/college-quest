import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetUser = vi.fn();
const mockServiceFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
  }),
  createServiceClient: () => ({
    from: (...args: unknown[]) => mockServiceFrom(...args),
  }),
}));

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

function authedUser(email = "user@test.com") {
  return {
    data: {
      user: { id: "u-1", email, user_metadata: {} },
    },
  };
}

// ── College Resources ─────────────────────────────────────────────────────────

describe("GET /api/colleges/[id]/resources", () => {
  let GET: (
    req: NextRequest,
    ctx: { params: Promise<{ id: string }> },
  ) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/colleges/[id]/resources/route");
    GET = mod.GET;
  });

  it("returns resources for a college", async () => {
    mockServiceFrom.mockReturnValue(
      chain({
        data: [
          { id: "r-1", title: "Financial Aid", type: "link", url: "https://example.com" },
        ],
        error: null,
      }),
    );

    const res = await GET(
      new NextRequest("http://localhost/api/colleges/c-1/resources"),
      { params: Promise.resolve({ id: "c-1" }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].title).toBe("Financial Aid");
  });

  it("returns empty array when no resources", async () => {
    mockServiceFrom.mockReturnValue(chain({ data: [], error: null }));

    const res = await GET(
      new NextRequest("http://localhost/api/colleges/c-1/resources"),
      { params: Promise.resolve({ id: "c-1" }) },
    );
    const body = await res.json();
    expect(body).toEqual([]);
  });
});

describe("POST /api/colleges/[id]/resources", () => {
  let POST: (
    req: NextRequest,
    ctx: { params: Promise<{ id: string }> },
  ) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/colleges/[id]/resources/route");
    POST = mod.POST;
  });

  it("creates a resource and returns 201", async () => {
    mockServiceFrom.mockReturnValue(
      chain({
        data: { id: "r-new", title: "Test Link", type: "link" },
        error: null,
      }),
    );

    const res = await POST(
      new NextRequest("http://localhost/api/colleges/c-1/resources", {
        method: "POST",
        body: JSON.stringify({
          title: "Test Link",
          url: "https://example.com",
          category: "Financial Aid",
        }),
      }),
      { params: Promise.resolve({ id: "c-1" }) },
    );
    expect(res.status).toBe(201);
  });

  it("sets type to link and passes optional fields", async () => {
    const qb = chain({ data: { id: "r-new" }, error: null });
    mockServiceFrom.mockReturnValue(qb);

    await POST(
      new NextRequest("http://localhost/api/colleges/c-1/resources", {
        method: "POST",
        body: JSON.stringify({
          title: "Aid Page",
          url: "https://example.com/aid",
          description: "Financial aid info",
          category: "Financial Aid",
        }),
      }),
      { params: Promise.resolve({ id: "c-1" }) },
    );

    const insertData = (qb.insert as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(insertData.type).toBe("link");
    expect(insertData.college_id).toBe("c-1");
    expect(insertData.description).toBe("Financial aid info");
    expect(insertData.category).toBe("Financial Aid");
  });
});

// ── Family Invites List ───────────────────────────────────────────────────────

describe("GET /api/family/invites", () => {
  let GET: () => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/family/invites/route");
    GET = mod.GET;
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns sent and received invites", async () => {
    mockGetUser.mockResolvedValue(authedUser());

    let callCount = 0;
    mockServiceFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // sent invites
        return chain({
          data: [
            {
              id: "inv-1",
              inviter_type: "parent",
              invited_email: "child@test.com",
              token: "tok-1",
              expires_at: "2030-01-01",
              claimed: false,
              created_at: "2025-06-01",
            },
          ],
          error: null,
        });
      }
      if (callCount === 2) {
        // received invites
        return chain({
          data: [
            {
              id: "inv-2",
              inviter_type: "student",
              invited_email: "user@test.com",
              token: "tok-2",
              expires_at: "2030-01-01",
              claimed: false,
              created_at: "2025-06-02",
              inviter_id: "other-user",
            },
          ],
          error: null,
        });
      }
      // profile lookup for inviter name
      return chain({
        data: { display_name: "Student Name", email: "student@test.com" },
        error: null,
      });
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.sent).toHaveLength(1);
    expect(body.sent[0].invitedEmail).toBe("child@test.com");
    expect(body.sent[0].inviterType).toBe("parent");

    expect(body.received).toHaveLength(1);
    expect(body.received[0].inviterName).toBe("Student Name");
    expect(body.received[0].inviterType).toBe("student");
  });

  it("falls back to email then 'Someone' for inviter name", async () => {
    mockGetUser.mockResolvedValue(authedUser());

    let callCount = 0;
    mockServiceFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return chain({ data: [], error: null }); // no sent
      }
      if (callCount === 2) {
        return chain({
          data: [
            {
              id: "inv-2",
              inviter_type: "parent",
              invited_email: "user@test.com",
              token: "tok",
              expires_at: "2030-01-01",
              claimed: false,
              created_at: "2025-06-01",
              inviter_id: "mystery-user",
            },
          ],
          error: null,
        });
      }
      // profile lookup → no profile found
      return chain({ data: null, error: null });
    });

    const res = await GET();
    const body = await res.json();
    expect(body.received[0].inviterName).toBe("Someone");
  });
});

// ── Autocomplete ──────────────────────────────────────────────────────────────

describe("GET /api/colleges/autocomplete", () => {
  let GET: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/colleges/autocomplete/route");
    GET = mod.GET;
  });

  it("returns empty array for query shorter than 2 chars", async () => {
    const res = await GET(
      new NextRequest("http://localhost/api/colleges/autocomplete?query=a"),
    );
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it("returns empty array for empty query", async () => {
    const res = await GET(
      new NextRequest("http://localhost/api/colleges/autocomplete"),
    );
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it("returns matching colleges for valid query", async () => {
    const qb = chain({
      data: [{ id: "c-1", name: "MIT" }],
      error: null,
    });
    mockServiceFrom.mockReturnValue(qb);

    const res = await GET(
      new NextRequest("http://localhost/api/colleges/autocomplete?query=MI"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
  });

  it("accepts q parameter as alias", async () => {
    const qb = chain({ data: [], error: null });
    mockServiceFrom.mockReturnValue(qb);

    const res = await GET(
      new NextRequest("http://localhost/api/colleges/autocomplete?q=Har"),
    );
    expect(res.status).toBe(200);
    expect(qb.ilike).toHaveBeenCalledWith("name", "%Har%");
  });

  it("limits results to 10", async () => {
    const qb = chain({ data: [], error: null });
    mockServiceFrom.mockReturnValue(qb);

    await GET(
      new NextRequest("http://localhost/api/colleges/autocomplete?query=college"),
    );
    expect(qb.limit).toHaveBeenCalledWith(10);
  });

  it("sets cache headers", async () => {
    mockServiceFrom.mockReturnValue(chain({ data: [], error: null }));

    const res = await GET(
      new NextRequest("http://localhost/api/colleges/autocomplete?query=MI"),
    );
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=300");
  });
});

// ── Schools Categories (batched pagination) ───────────────────────────────────

describe("GET /api/schools/categories", () => {
  let GET: () => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/schools/categories/route");
    GET = mod.GET;
  });

  it("collects and deduplicates categories across batches", async () => {
    let callCount = 0;
    mockServiceFrom.mockImplementation(() => {
      const c: Record<string, unknown> = {};
      const methods = ["select", "not", "order", "range"];
      for (const m of methods) {
        c[m] = vi.fn().mockReturnValue(c);
      }
      // First batch returns 1000 rows, second returns fewer → done
      c.then = (resolve: (v: unknown) => void) => {
        callCount++;
        if (callCount === 1) {
          // First batch: 1000 rows (some duplicates)
          const data = Array.from({ length: 1000 }, (_, i) => ({
            category: i < 500 ? "Engineering" : "Arts",
          }));
          resolve({ data, error: null });
        } else {
          // Second batch: less than 1000 → terminates loop
          resolve({
            data: [
              { category: "Arts" },
              { category: "Science" },
            ],
            error: null,
          });
        }
      };
      return c;
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();

    // Should have deduplicated: Arts, Engineering, Science
    expect(body).toEqual(["Arts", "Engineering", "Science"]);
  });

  it("handles empty results", async () => {
    mockServiceFrom.mockImplementation(() => {
      const c: Record<string, unknown> = {};
      ["select", "not", "order", "range"].forEach((m) => {
        c[m] = vi.fn().mockReturnValue(c);
      });
      c.then = (resolve: (v: unknown) => void) => resolve({ data: [], error: null });
      return c;
    });

    const res = await GET();
    const body = await res.json();
    expect(body).toEqual([]);
  });
});

// ── Schools Programs ──────────────────────────────────────────────────────────

describe("GET /api/schools/programs", () => {
  let GET: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/schools/programs/route");
    GET = mod.GET;
  });

  it("returns all programs when no collegeIds given", async () => {
    mockServiceFrom.mockReturnValue(
      chain({
        data: [{ id: "s-1", name: "Computer Science" }],
        error: null,
      }),
    );

    const res = await GET(
      new NextRequest("http://localhost/api/schools/programs"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
  });

  it("filters by collegeIds", async () => {
    const qb = chain({ data: [], error: null });
    mockServiceFrom.mockReturnValue(qb);

    await GET(
      new NextRequest(
        "http://localhost/api/schools/programs?collegeIds=c-1,c-2",
      ),
    );

    expect(qb.in).toHaveBeenCalledWith("college_id", ["c-1", "c-2"]);
  });
});
