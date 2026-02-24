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

function authedUser(id = "user-1") {
  return {
    data: { user: { id, email: "user@test.com" } },
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("GET /api/colleges/[collegeId]/family-status", () => {
  let GET: (
    req: NextRequest,
    ctx: { params: Promise<{ collegeId: string }> },
  ) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import(
      "@/app/api/colleges/[collegeId]/family-status/route"
    );
    GET = mod.GET;
  });

  const req = new NextRequest("http://localhost/api/colleges/c1/family-status");
  const ctx = { params: Promise.resolve({ collegeId: "college-1" }) };

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await GET(req, ctx);
    expect(res.status).toBe(401);
  });

  it("returns empty array when no family links", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    const linksChain = chain({ data: [] });
    linksChain.then = (resolve: (v: unknown) => void) =>
      resolve({ data: [], error: null });
    mockServiceFrom.mockReturnValue(linksChain);

    const res = await GET(req, ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.familyFavorites).toEqual([]);
  });

  it("returns empty array when no family members have favorited", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    let callCount = 0;
    mockServiceFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // family_links query
        const c = chain({ data: null });
        c.then = (resolve: (v: unknown) => void) =>
          resolve({
            data: [
              {
                parent_id: "user-1",
                student_id: "student-1",
                can_view_favorites: true,
              },
            ],
            error: null,
          });
        return c;
      }
      if (callCount === 2) {
        // favorites query — no matches
        const c = chain({ data: [] });
        c.then = (resolve: (v: unknown) => void) =>
          resolve({ data: [], error: null });
        return c;
      }
      return chain({ data: [] });
    });

    const res = await GET(req, ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.familyFavorites).toEqual([]);
  });

  it("returns family members who favorited the college", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    let callCount = 0;
    mockServiceFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // family_links
        const c = chain({ data: null });
        c.then = (resolve: (v: unknown) => void) =>
          resolve({
            data: [
              {
                parent_id: "user-1",
                student_id: "student-1",
                can_view_favorites: true,
              },
            ],
            error: null,
          });
        return c;
      }
      if (callCount === 2) {
        // favorites query
        const c = chain({ data: null });
        c.then = (resolve: (v: unknown) => void) =>
          resolve({
            data: [{ user_id: "student-1" }],
            error: null,
          });
        return c;
      }
      if (callCount === 3) {
        // profiles query
        const c = chain({ data: null });
        c.then = (resolve: (v: unknown) => void) =>
          resolve({
            data: [
              {
                id: "student-1",
                display_name: "My Student",
                account_type: "student",
              },
            ],
            error: null,
          });
        return c;
      }
      return chain({ data: [] });
    });

    const res = await GET(req, ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.familyFavorites).toHaveLength(1);
    expect(body.familyFavorites[0].displayName).toBe("My Student");
    expect(body.familyFavorites[0].accountType).toBe("student");
  });

  it("respects can_view_favorites privacy setting", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    const c = chain({ data: null });
    c.then = (resolve: (v: unknown) => void) =>
      resolve({
        data: [
          {
            parent_id: "user-1",
            student_id: "student-1",
            can_view_favorites: false,
          },
        ],
        error: null,
      });
    mockServiceFrom.mockReturnValue(c);

    const res = await GET(req, ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.familyFavorites).toEqual([]);
  });
});
