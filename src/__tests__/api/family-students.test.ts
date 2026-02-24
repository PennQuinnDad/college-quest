import { describe, it, expect, vi, beforeEach } from "vitest";

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
    "order", "limit", "maybeSingle", "single",
  ];
  for (const m of methods) {
    c[m] = vi.fn().mockReturnValue(c);
  }
  c.maybeSingle = vi.fn().mockResolvedValue(terminalResult);
  c.single = vi.fn().mockResolvedValue(terminalResult);
  c.then = (resolve: (v: unknown) => void) => resolve(terminalResult);
  return c;
}

function authedParent() {
  return {
    data: { user: { id: "parent-1", email: "parent@test.com", user_metadata: {} } },
  };
}

function authedStudent() {
  return {
    data: { user: { id: "student-1", email: "student@test.com", user_metadata: {} } },
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("GET /api/family/students", () => {
  let GET: () => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/family/students/route");
    GET = mod.GET;
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 403 when called by a student", async () => {
    mockGetUser.mockResolvedValue(authedStudent());
    mockServiceFrom.mockReturnValue(chain({ data: { account_type: "student" } }));

    const res = await GET();
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/parent/i);
  });

  it("returns empty students array when no links exist", async () => {
    mockGetUser.mockResolvedValue(authedParent());
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
    expect(body.students).toEqual([]);
  });
});
