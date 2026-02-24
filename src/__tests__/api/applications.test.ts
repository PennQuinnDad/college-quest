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
    "upsert", "order", "limit", "ilike", "maybeSingle", "single",
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

function makePostRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/applications", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// ── Tests: GET ─────────────────────────────────────────────────────────────────

describe("GET /api/applications", () => {
  let GET: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/applications/route");
    GET = mod.GET;
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await GET(
      new NextRequest("http://localhost/api/applications"),
    );
    expect(res.status).toBe(401);
  });

  it("returns empty array when no applications", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    const c = chain({ data: [] });
    c.then = (resolve: (v: unknown) => void) =>
      resolve({ data: [], error: null });
    mockServiceFrom.mockReturnValue(c);

    const res = await GET(
      new NextRequest("http://localhost/api/applications"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.applications).toEqual([]);
  });

  it("returns 403 when viewing student without family link", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    mockServiceFrom.mockReturnValue(chain({ data: null }));

    const res = await GET(
      new NextRequest("http://localhost/api/applications?studentId=other-user"),
    );
    expect(res.status).toBe(403);
  });
});

// ── Tests: POST ────────────────────────────────────────────────────────────────

describe("POST /api/applications", () => {
  let POST: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/applications/route");
    POST = mod.POST;
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(makePostRequest({ collegeId: "c1" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when collegeId is missing", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    const res = await POST(makePostRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid status", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    const res = await POST(
      makePostRequest({ collegeId: "c1", status: "invalid" }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid application type", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    const res = await POST(
      makePostRequest({ collegeId: "c1", applicationType: "invalid" }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when notes exceed 1000 chars", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    const res = await POST(
      makePostRequest({ collegeId: "c1", notes: "x".repeat(1001) }),
    );
    expect(res.status).toBe(400);
  });

  it("creates an application successfully", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    mockServiceFrom.mockReturnValue(
      chain({
        data: {
          id: "app-1",
          college_id: "c1",
          user_id: "user-1",
          status: "researching",
          application_type: null,
          deadline: null,
          submitted_at: null,
          decision_at: null,
          notes: null,
          shared_with_family: true,
          created_at: "2026-02-24T00:00:00Z",
          updated_at: "2026-02-24T00:00:00Z",
        },
      }),
    );

    const res = await POST(makePostRequest({ collegeId: "c1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("app-1");
    expect(body.status).toBe("researching");
  });
});

// ── Tests: DELETE ──────────────────────────────────────────────────────────────

describe("DELETE /api/applications", () => {
  let DELETE: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/applications/route");
    DELETE = mod.DELETE;
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await DELETE(
      new NextRequest("http://localhost/api/applications?id=app-1", {
        method: "DELETE",
      }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when id is missing", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    const res = await DELETE(
      new NextRequest("http://localhost/api/applications", {
        method: "DELETE",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("deletes an application successfully", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    const c = chain({ data: null, error: null });
    c.then = (resolve: (v: unknown) => void) =>
      resolve({ data: null, error: null });
    mockServiceFrom.mockReturnValue(c);

    const res = await DELETE(
      new NextRequest("http://localhost/api/applications?id=app-1", {
        method: "DELETE",
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toMatch(/removed/i);
  });
});
