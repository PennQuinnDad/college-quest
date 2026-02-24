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

function makePostRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/family/suggestions", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function makePatchRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/family/suggestions", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

// ── Tests: GET ─────────────────────────────────────────────────────────────────

describe("GET /api/family/suggestions", () => {
  let GET: () => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/family/suggestions/route");
    GET = mod.GET;
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns empty arrays when no suggestions", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    mockServiceFrom.mockImplementation(() => {
      const c = chain({ data: null });
      c.then = (resolve: (v: unknown) => void) =>
        resolve({ data: [], error: null });
      return c;
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.received).toEqual([]);
    expect(body.sent).toEqual([]);
  });
});

// ── Tests: POST ────────────────────────────────────────────────────────────────

describe("POST /api/family/suggestions", () => {
  let POST: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/family/suggestions/route");
    POST = mod.POST;
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(
      makePostRequest({ collegeId: "c1", toUserId: "s1" }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when collegeId is missing", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    const res = await POST(makePostRequest({ toUserId: "s1" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when toUserId is missing", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    const res = await POST(makePostRequest({ collegeId: "c1" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when trying to suggest to self", async () => {
    mockGetUser.mockResolvedValue(authedUser("user-1"));
    const res = await POST(
      makePostRequest({ collegeId: "c1", toUserId: "user-1" }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/yourself/i);
  });

  it("returns 400 when note exceeds 500 chars", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    const res = await POST(
      makePostRequest({
        collegeId: "c1",
        toUserId: "s1",
        note: "x".repeat(501),
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/500/);
  });

  it("returns 403 when no family link exists", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    mockServiceFrom.mockReturnValue(chain({ data: null }));

    const res = await POST(
      makePostRequest({ collegeId: "c1", toUserId: "s1" }),
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/linked family/i);
  });

  it("returns 409 for duplicate suggestion", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    let callCount = 0;
    mockServiceFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // family link check — found
        return chain({ data: { id: "link-1" } });
      }
      // insert — duplicate
      return chain({ data: null, error: { code: "23505" } });
    });

    const res = await POST(
      makePostRequest({ collegeId: "c1", toUserId: "s1" }),
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/already suggested/i);
  });

  it("creates a suggestion successfully", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    let callCount = 0;
    mockServiceFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // family link check
        return chain({ data: { id: "link-1" } });
      }
      // insert
      return chain({ data: { id: "suggestion-1" } });
    });

    const res = await POST(
      makePostRequest({ collegeId: "c1", toUserId: "s1", note: "Check this out!" }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe("suggestion-1");
  });
});

// ── Tests: PATCH ───────────────────────────────────────────────────────────────

describe("PATCH /api/family/suggestions", () => {
  let PATCH: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/family/suggestions/route");
    PATCH = mod.PATCH;
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await PATCH(
      makePatchRequest({ suggestionId: "s1", action: "accepted" }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when suggestionId is missing", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    const res = await PATCH(makePatchRequest({ action: "accepted" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid action", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    const res = await PATCH(
      makePatchRequest({ suggestionId: "s1", action: "invalid" }),
    );
    expect(res.status).toBe(400);
  });

  it("accepts a suggestion successfully", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    const c = chain({ data: null, error: null });
    c.then = (resolve: (v: unknown) => void) =>
      resolve({ data: null, error: null });
    mockServiceFrom.mockReturnValue(c);

    const res = await PATCH(
      makePatchRequest({ suggestionId: "s1", action: "accepted" }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toMatch(/accepted/i);
  });

  it("dismisses a suggestion successfully", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    const c = chain({ data: null, error: null });
    c.then = (resolve: (v: unknown) => void) =>
      resolve({ data: null, error: null });
    mockServiceFrom.mockReturnValue(c);

    const res = await PATCH(
      makePatchRequest({ suggestionId: "s1", action: "dismissed" }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toMatch(/dismissed/i);
  });
});
