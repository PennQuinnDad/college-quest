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

function chain(terminalResult: { data?: unknown; error?: unknown }) {
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

function authedUser(id = "parent-1") {
  return {
    data: { user: { id, email: "parent@test.com" } },
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("GET /api/family/activity", () => {
  let GET: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/family/activity/route");
    GET = mod.GET;
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await GET(
      new NextRequest("http://localhost/api/family/activity"),
    );
    expect(res.status).toBe(401);
  });

  it("returns empty events when no activity", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    let callCount = 0;
    mockServiceFrom.mockImplementation(() => {
      callCount++;
      const c = chain({ data: null });
      c.then = (resolve: (v: unknown) => void) =>
        resolve({ data: [], error: null });
      return c;
    });

    const res = await GET(
      new NextRequest("http://localhost/api/family/activity"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.events).toEqual([]);
  });

  it("returns 403 when no family link exists for student", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    mockServiceFrom.mockReturnValue(chain({ data: null }));

    const res = await GET(
      new NextRequest("http://localhost/api/family/activity?studentId=student-1"),
    );
    expect(res.status).toBe(403);
  });

  it("returns 403 when activity viewing not permitted", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    mockServiceFrom.mockReturnValue(
      chain({ data: { id: "link-1", can_view_activity: false } }),
    );

    const res = await GET(
      new NextRequest("http://localhost/api/family/activity?studentId=student-1"),
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/not permitted/i);
  });
});
