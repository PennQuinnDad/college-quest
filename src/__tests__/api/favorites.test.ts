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

function chain(result: { data?: unknown; error?: unknown; count?: number | null }) {
  const c: Record<string, unknown> = {};
  const methods = [
    "select", "insert", "upsert", "delete",
    "eq", "neq", "in", "order", "limit", "range",
  ];
  for (const m of methods) {
    c[m] = vi.fn().mockReturnValue(c);
  }
  c.single = vi.fn().mockResolvedValue(result);
  c.maybeSingle = vi.fn().mockResolvedValue(result);
  c.then = (resolve: (v: unknown) => void) => resolve(result);
  return c;
}

function authedUser() {
  return {
    data: {
      user: { id: "u-1", email: "u@test.com", user_metadata: { full_name: "User" } },
    },
  };
}

describe("GET /api/favorites", () => {
  let GET: () => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/favorites/route");
    GET = mod.GET;
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns list of favorite college IDs", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    mockServiceFrom.mockReturnValue(
      chain({
        data: [{ college_id: "c-1" }, { college_id: "c-2" }],
        error: null,
      }),
    );

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.favorites).toEqual(["c-1", "c-2"]);
  });

  it("returns empty array when no favorites", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    mockServiceFrom.mockReturnValue(chain({ data: [], error: null }));

    const res = await GET();
    const body = await res.json();
    expect(body.favorites).toEqual([]);
  });
});

describe("POST /api/favorites", () => {
  let POST: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/favorites/route");
    POST = mod.POST;
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const req = new NextRequest("http://localhost/api/favorites", {
      method: "POST",
      body: JSON.stringify({ collegeId: "c-1" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when collegeId is missing", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    const req = new NextRequest("http://localhost/api/favorites", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when collegeId is not a string", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    const req = new NextRequest("http://localhost/api/favorites", {
      method: "POST",
      body: JSON.stringify({ collegeId: 123 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 201 on successful add", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    mockServiceFrom.mockReturnValue(chain({ data: null, error: null }));

    const req = new NextRequest("http://localhost/api/favorites", {
      method: "POST",
      body: JSON.stringify({ collegeId: "c-1" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
  });

  it("returns 409 when favorite already exists", async () => {
    mockGetUser.mockResolvedValue(authedUser());

    let callCount = 0;
    mockServiceFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // upsert profile
        return chain({ data: null, error: null });
      }
      // insert favorite → duplicate
      return chain({ data: null, error: { code: "23505" } });
    });

    const req = new NextRequest("http://localhost/api/favorites", {
      method: "POST",
      body: JSON.stringify({ collegeId: "c-1" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(409);
  });
});

describe("GET /api/favorites/[collegeId]", () => {
  let GET: (
    req: NextRequest,
    ctx: { params: Promise<{ collegeId: string }> },
  ) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/favorites/[collegeId]/route");
    GET = mod.GET;
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await GET(
      new NextRequest("http://localhost/api/favorites/c-1"),
      { params: Promise.resolve({ collegeId: "c-1" }) },
    );
    expect(res.status).toBe(401);
  });

  it("returns isFavorite: true when favorited", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    mockServiceFrom.mockReturnValue(chain({ data: { college_id: "c-1" } }));

    const res = await GET(
      new NextRequest("http://localhost/api/favorites/c-1"),
      { params: Promise.resolve({ collegeId: "c-1" }) },
    );
    const body = await res.json();
    expect(body.isFavorite).toBe(true);
  });

  it("returns isFavorite: false when not favorited", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    mockServiceFrom.mockReturnValue(chain({ data: null }));

    const res = await GET(
      new NextRequest("http://localhost/api/favorites/c-1"),
      { params: Promise.resolve({ collegeId: "c-1" }) },
    );
    const body = await res.json();
    expect(body.isFavorite).toBe(false);
  });
});

describe("DELETE /api/favorites/[collegeId]", () => {
  let DELETE: (
    req: NextRequest,
    ctx: { params: Promise<{ collegeId: string }> },
  ) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/favorites/[collegeId]/route");
    DELETE = mod.DELETE;
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await DELETE(
      new NextRequest("http://localhost/api/favorites/c-1", { method: "DELETE" }),
      { params: Promise.resolve({ collegeId: "c-1" }) },
    );
    expect(res.status).toBe(401);
  });

  it("returns success on delete", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    mockServiceFrom.mockReturnValue(chain({ data: null, error: null }));

    const res = await DELETE(
      new NextRequest("http://localhost/api/favorites/c-1", { method: "DELETE" }),
      { params: Promise.resolve({ collegeId: "c-1" }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toMatch(/removed/i);
  });
});
