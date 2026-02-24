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

function chain(terminalResult: { data?: unknown; error?: unknown; count?: number }) {
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

// ── Tests: GET ──────────────────────────────────────────────────────────────────

describe("GET /api/notifications", () => {
  let GET: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/notifications/route");
    GET = mod.GET;
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await GET(
      new NextRequest("http://localhost/api/notifications"),
    );
    expect(res.status).toBe(401);
  });

  it("returns notifications for authenticated user", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    let callIndex = 0;
    mockServiceFrom.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) {
        // Main query
        const c = chain({ data: [] });
        c.then = (resolve: (v: unknown) => void) =>
          resolve({ data: [{ id: "n1", type: "new_suggestion", title: "Test", message: null, link: null, metadata: {}, read: false, created_at: "2026-02-24T00:00:00Z" }], error: null });
        return c;
      }
      // Count query
      const c = chain({ data: [] });
      c.then = (resolve: (v: unknown) => void) =>
        resolve({ data: [{ id: "n1" }], error: null });
      return c;
    });

    const res = await GET(
      new NextRequest("http://localhost/api/notifications"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.notifications).toHaveLength(1);
    expect(body.notifications[0].type).toBe("new_suggestion");
  });
});

// ── Tests: PATCH ────────────────────────────────────────────────────────────────

describe("PATCH /api/notifications", () => {
  let PATCH: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/notifications/route");
    PATCH = mod.PATCH;
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await PATCH(
      new NextRequest("http://localhost/api/notifications", {
        method: "PATCH",
        body: JSON.stringify({ markAllRead: true }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it("marks all notifications as read", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    const c = chain({ data: null, error: null });
    c.then = (resolve: (v: unknown) => void) =>
      resolve({ data: null, error: null });
    mockServiceFrom.mockReturnValue(c);

    const res = await PATCH(
      new NextRequest("http://localhost/api/notifications", {
        method: "PATCH",
        body: JSON.stringify({ markAllRead: true }),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toMatch(/all/i);
  });

  it("returns 400 when no valid params", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    const res = await PATCH(
      new NextRequest("http://localhost/api/notifications", {
        method: "PATCH",
        body: JSON.stringify({}),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("marks specific notifications as read", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    const c = chain({ data: null, error: null });
    c.then = (resolve: (v: unknown) => void) =>
      resolve({ data: null, error: null });
    mockServiceFrom.mockReturnValue(c);

    const res = await PATCH(
      new NextRequest("http://localhost/api/notifications", {
        method: "PATCH",
        body: JSON.stringify({ notificationIds: ["n1", "n2"] }),
      }),
    );
    expect(res.status).toBe(200);
  });
});
