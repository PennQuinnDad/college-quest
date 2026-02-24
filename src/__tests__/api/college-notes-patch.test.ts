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

vi.mock("@/lib/activity", () => ({
  logActivity: vi.fn(),
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

function makePatchRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/colleges/c1/notes", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

// ── Tests ───────────────────────────────────────────────────────────────────────

describe("PATCH /api/colleges/[collegeId]/notes", () => {
  let PATCH: (req: NextRequest, ctx: { params: Promise<{ collegeId: string }> }) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/colleges/[id]/notes/route");
    PATCH = mod.PATCH;
  });

  const ctx = { params: Promise.resolve({ collegeId: "c1" }) };

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await PATCH(makePatchRequest({ noteId: "n1", content: "new" }), ctx);
    expect(res.status).toBe(401);
  });

  it("returns 400 when noteId missing", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    const res = await PATCH(makePatchRequest({ content: "new" }), ctx);
    expect(res.status).toBe(400);
  });

  it("returns 400 when no fields to update", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    const res = await PATCH(makePatchRequest({ noteId: "n1" }), ctx);
    expect(res.status).toBe(400);
  });

  it("returns 400 for empty content", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    const res = await PATCH(makePatchRequest({ noteId: "n1", content: "   " }), ctx);
    expect(res.status).toBe(400);
  });

  it("returns 400 for content over 2000 chars", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    const res = await PATCH(
      makePatchRequest({ noteId: "n1", content: "x".repeat(2001) }),
      ctx,
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid visibility", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    const res = await PATCH(
      makePatchRequest({ noteId: "n1", visibility: "public" }),
      ctx,
    );
    expect(res.status).toBe(400);
  });

  it("updates a note successfully", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    let callIndex = 0;
    mockServiceFrom.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) {
        return chain({
          data: {
            id: "n1",
            college_id: "c1",
            user_id: "user-1",
            content: "updated content",
            visibility: "family",
            created_at: "2026-02-24T00:00:00Z",
            updated_at: "2026-02-24T01:00:00Z",
          },
        });
      }
      // Profile query
      return chain({ data: { display_name: "Test User" } });
    });

    const res = await PATCH(
      makePatchRequest({ noteId: "n1", content: "updated content" }),
      ctx,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.content).toBe("updated content");
    expect(body.userName).toBe("Test User");
  });
});
