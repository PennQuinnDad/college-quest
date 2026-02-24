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

function chain(result: { data?: unknown; error?: unknown }) {
  const c: Record<string, unknown> = {};
  const methods = ["select", "update", "eq", "order", "limit"];
  for (const m of methods) {
    c[m] = vi.fn().mockReturnValue(c);
  }
  c.single = vi.fn().mockResolvedValue(result);
  c.maybeSingle = vi.fn().mockResolvedValue(result);
  c.then = (resolve: (v: unknown) => void) => resolve(result);
  return c;
}

function authedUser(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      user: {
        id: "u-1",
        email: "user@test.com",
        user_metadata: { full_name: "Test User", avatar_url: "https://img.test/a.jpg" },
        ...overrides,
      },
    },
  };
}

describe("GET /api/me", () => {
  let GET: () => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/me/route");
    GET = mod.GET;
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns profile with camelCase field mapping", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    mockServiceFrom.mockReturnValue(
      chain({
        data: {
          display_name: "Test User",
          role: "user",
          account_type: "student",
          graduation_year: 2027,
          high_school: "Test High",
          profile_completed: true,
          last_active_at: new Date(Date.now() - 60_000).toISOString(), // 1 min ago
        },
      }),
    );

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      id: "u-1",
      email: "user@test.com",
      displayName: "Test User",
      role: "user",
      accountType: "student",
      graduationYear: 2027,
      highSchool: "Test High",
      profileCompleted: true,
      avatarUrl: "https://img.test/a.jpg",
    });
  });

  it("falls back to user_metadata.full_name when display_name is null", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    mockServiceFrom.mockReturnValue(
      chain({
        data: {
          display_name: null,
          role: "user",
          account_type: "student",
          graduation_year: null,
          high_school: null,
          profile_completed: false,
          last_active_at: null,
        },
      }),
    );

    const res = await GET();
    const body = await res.json();
    expect(body.displayName).toBe("Test User");
  });

  it("defaults when no profile exists", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    mockServiceFrom.mockReturnValue(chain({ data: null }));

    const res = await GET();
    const body = await res.json();
    expect(body.role).toBe("user");
    expect(body.accountType).toBe("student");
    expect(body.profileCompleted).toBe(false);
  });
});

describe("PATCH /api/me", () => {
  let PATCH: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/me/route");
    PATCH = mod.PATCH;
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const req = new NextRequest("http://localhost/api/me", {
      method: "PATCH",
      body: JSON.stringify({ accountType: "student" }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid accountType", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    const req = new NextRequest("http://localhost/api/me", {
      method: "PATCH",
      body: JSON.stringify({ accountType: "teacher" }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/accountType/);
  });

  it("returns 400 for graduationYear below 2020", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    const req = new NextRequest("http://localhost/api/me", {
      method: "PATCH",
      body: JSON.stringify({ graduationYear: 2019 }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/2020/);
  });

  it("returns 400 for graduationYear above 2040", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    const req = new NextRequest("http://localhost/api/me", {
      method: "PATCH",
      body: JSON.stringify({ graduationYear: 2041 }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });

  it("accepts valid accountType 'student'", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    mockServiceFrom.mockReturnValue(chain({ data: null, error: null }));

    const req = new NextRequest("http://localhost/api/me", {
      method: "PATCH",
      body: JSON.stringify({ accountType: "student" }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(200);
  });

  it("accepts valid accountType 'parent'", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    mockServiceFrom.mockReturnValue(chain({ data: null, error: null }));

    const req = new NextRequest("http://localhost/api/me", {
      method: "PATCH",
      body: JSON.stringify({ accountType: "parent" }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(200);
  });

  it("accepts graduationYear at boundaries", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    mockServiceFrom.mockReturnValue(chain({ data: null, error: null }));

    const req2020 = new NextRequest("http://localhost/api/me", {
      method: "PATCH",
      body: JSON.stringify({ graduationYear: 2020 }),
    });
    const res2020 = await PATCH(req2020);
    expect(res2020.status).toBe(200);

    const req2040 = new NextRequest("http://localhost/api/me", {
      method: "PATCH",
      body: JSON.stringify({ graduationYear: 2040 }),
    });
    const res2040 = await PATCH(req2040);
    expect(res2040.status).toBe(200);
  });

  it("allows null graduationYear", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    mockServiceFrom.mockReturnValue(chain({ data: null, error: null }));

    const req = new NextRequest("http://localhost/api/me", {
      method: "PATCH",
      body: JSON.stringify({ graduationYear: null }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(200);
  });
});
