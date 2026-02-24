import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

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

// ── Helpers ────────────────────────────────────────────────────────────────────

function chain(terminalResult: { data?: unknown; error?: unknown; count?: number | null }) {
  const c: Record<string, unknown> = {};
  const methods = [
    "select", "eq", "neq", "or", "in", "insert", "update", "delete",
    "order", "limit", "ilike", "maybeSingle", "single",
  ];
  for (const m of methods) {
    c[m] = vi.fn().mockReturnValue(c);
  }
  c.maybeSingle = vi.fn().mockResolvedValue(terminalResult);
  c.single = vi.fn().mockResolvedValue(terminalResult);
  c.then = (resolve: (v: unknown) => void) => resolve(terminalResult);
  return c;
}

function authedUser(id = "user-1", email = "parent@test.com") {
  return {
    data: { user: { id, email, user_metadata: { full_name: "Test User" } } },
  };
}

// ── Tests: GET /api/family/links ────────────────────────────────────────────

describe("GET /api/family/links", () => {
  let GET: () => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/family/links/route");
    GET = mod.GET;
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 404 when profile not found", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    mockServiceFrom.mockReturnValue(chain({ data: null }));
    const res = await GET();
    expect(res.status).toBe(404);
  });

  it("returns empty members array when no links", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    let callCount = 0;
    mockServiceFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return chain({ data: { account_type: "parent" } });
      }
      // family_links query
      const c = chain({ data: [] });
      c.then = (resolve: (v: unknown) => void) => resolve({ data: [], error: null });
      return c;
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.members).toEqual([]);
  });
});

// ── Tests: PATCH /api/family/links ──────────────────────────────────────────

describe("PATCH /api/family/links", () => {
  let PATCH: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/family/links/route");
    PATCH = mod.PATCH;
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await PATCH(
      new NextRequest("http://localhost/api/family/links", {
        method: "PATCH",
        body: JSON.stringify({ linkId: "link-1", action: "revoke" }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when linkId is missing", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    const res = await PATCH(
      new NextRequest("http://localhost/api/family/links", {
        method: "PATCH",
        body: JSON.stringify({ action: "revoke" }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when link not found", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    mockServiceFrom.mockReturnValue(chain({ data: null }));
    const res = await PATCH(
      new NextRequest("http://localhost/api/family/links", {
        method: "PATCH",
        body: JSON.stringify({ linkId: "bad-id", action: "revoke" }),
      }),
    );
    expect(res.status).toBe(404);
  });

  it("revokes a link successfully", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    let callCount = 0;
    mockServiceFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // find link
        return chain({
          data: { id: "link-1", parent_id: "user-1", student_id: "student-1", status: "active" },
        });
      }
      // update link
      return chain({ data: null, error: null });
    });

    const res = await PATCH(
      new NextRequest("http://localhost/api/family/links", {
        method: "PATCH",
        body: JSON.stringify({ linkId: "link-1", action: "revoke" }),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toMatch(/revoked/i);
  });

  it("returns 403 when parent tries to update privacy settings", async () => {
    mockGetUser.mockResolvedValue(authedUser("user-1")); // parent
    let callCount = 0;
    mockServiceFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return chain({
          data: { id: "link-1", parent_id: "user-1", student_id: "student-1", status: "active" },
        });
      }
      return chain({ data: null });
    });

    const res = await PATCH(
      new NextRequest("http://localhost/api/family/links", {
        method: "PATCH",
        body: JSON.stringify({ linkId: "link-1", canViewFavorites: false }),
      }),
    );
    expect(res.status).toBe(403);
  });

  it("allows student to update privacy settings", async () => {
    mockGetUser.mockResolvedValue(authedUser("student-1")); // student
    let callCount = 0;
    mockServiceFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return chain({
          data: { id: "link-1", parent_id: "parent-1", student_id: "student-1", status: "active" },
        });
      }
      return chain({ data: null, error: null });
    });

    const res = await PATCH(
      new NextRequest("http://localhost/api/family/links", {
        method: "PATCH",
        body: JSON.stringify({ linkId: "link-1", canViewFavorites: false }),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toMatch(/privacy/i);
  });
});
