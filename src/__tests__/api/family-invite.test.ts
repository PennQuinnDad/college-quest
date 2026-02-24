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
  const methods = ["select", "eq", "neq", "insert", "upsert", "update", "maybeSingle", "single"];
  for (const m of methods) {
    c[m] = vi.fn().mockReturnValue(c);
  }
  c.maybeSingle = vi.fn().mockResolvedValue(terminalResult);
  c.single = vi.fn().mockResolvedValue(terminalResult);
  c.then = (resolve: (v: unknown) => void) => resolve(terminalResult);
  return c;
}

function authedUser(email = "inviter@test.com") {
  return {
    data: {
      user: { id: "user-1", email, user_metadata: { full_name: "Inviter" } },
    },
  };
}

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/family/invite", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/family/invite", () => {
  let POST: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Dynamic import after mocks
    const mod = await import("@/app/api/family/invite/route");
    POST = mod.POST;
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await POST(makeRequest({ email: "a@b.com" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid email", async () => {
    mockGetUser.mockResolvedValue(authedUser());

    const res = await POST(makeRequest({ email: "not-an-email" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/valid email/i);
  });

  it("returns 400 for empty email", async () => {
    mockGetUser.mockResolvedValue(authedUser());

    const res = await POST(makeRequest({ email: "" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for self-invite", async () => {
    mockGetUser.mockResolvedValue(authedUser("me@test.com"));

    const res = await POST(makeRequest({ email: "me@test.com" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/yourself/i);
  });

  it("returns 400 when profile is missing", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    mockServiceFrom.mockReturnValue(chain({ data: null, error: null }));

    const res = await POST(makeRequest({ email: "other@test.com" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/profile/i);
  });

  it("returns 409 when pending invite already exists", async () => {
    mockGetUser.mockResolvedValue(authedUser());

    let callCount = 0;
    mockServiceFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // profiles lookup → returns profile
        return chain({ data: { account_type: "parent", display_name: "Dad" } });
      }
      if (callCount === 2) {
        // existing invite check → found one
        return chain({ data: { id: "existing-invite" } });
      }
      return chain({ data: null });
    });

    const res = await POST(makeRequest({ email: "child@test.com" }));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/pending invite/i);
  });

  it("returns 201 on successful invite creation", async () => {
    mockGetUser.mockResolvedValue(authedUser());

    let callCount = 0;
    mockServiceFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // profiles lookup
        return chain({ data: { account_type: "parent", display_name: "Dad" } });
      }
      if (callCount === 2) {
        // existing invite check → none
        return chain({ data: null });
      }
      if (callCount === 3) {
        // insert invite
        return chain({
          data: { id: "inv-1", token: "tok-abc", expires_at: "2026-03-01T00:00:00Z" },
        });
      }
      // upsert allowed_emails
      return chain({ data: null });
    });

    const res = await POST(makeRequest({ email: "child@test.com" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.token).toBeDefined();
    expect(body.invitedEmail).toBe("child@test.com");
  });
});

describe("POST /api/family/invite/[token]/accept", () => {
  let POST: (
    req: NextRequest,
    ctx: { params: Promise<{ token: string }> },
  ) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/family/invite/[token]/accept/route");
    POST = mod.POST;
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await POST(
      new NextRequest("http://localhost/api/family/invite/tok/accept", { method: "POST" }),
      { params: Promise.resolve({ token: "tok" }) },
    );
    expect(res.status).toBe(401);
  });

  it("returns 404 when invite not found", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    mockServiceFrom.mockReturnValue(chain({ data: null, error: null }));

    const res = await POST(
      new NextRequest("http://localhost/api/family/invite/bad-token/accept", { method: "POST" }),
      { params: Promise.resolve({ token: "bad-token" }) },
    );
    expect(res.status).toBe(404);
  });

  it("returns 410 for expired invite", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    mockServiceFrom.mockReturnValue(
      chain({
        data: {
          id: "inv-1",
          inviter_id: "other-user",
          inviter_type: "parent",
          expires_at: "2020-01-01T00:00:00Z", // expired
          claimed: false,
        },
      }),
    );

    const res = await POST(
      new NextRequest("http://localhost/api/family/invite/tok/accept", { method: "POST" }),
      { params: Promise.resolve({ token: "tok" }) },
    );
    expect(res.status).toBe(410);
  });

  it("returns 400 when accepting own invite", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    mockServiceFrom.mockReturnValue(
      chain({
        data: {
          id: "inv-1",
          inviter_id: "user-1", // same as user
          inviter_type: "parent",
          expires_at: "2030-01-01T00:00:00Z",
          claimed: false,
        },
      }),
    );

    const res = await POST(
      new NextRequest("http://localhost/api/family/invite/tok/accept", { method: "POST" }),
      { params: Promise.resolve({ token: "tok" }) },
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/own invite/i);
  });

  it("correctly assigns parent/student roles when parent invites", async () => {
    mockGetUser.mockResolvedValue(authedUser());

    let insertedLink: Record<string, unknown> | null = null;
    let callCount = 0;

    mockServiceFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // invite lookup
        return chain({
          data: {
            id: "inv-1",
            inviter_id: "parent-id",
            inviter_type: "parent",
            expires_at: "2030-01-01T00:00:00Z",
            claimed: false,
          },
        });
      }
      if (callCount === 2) {
        // family_links insert
        const c = chain({ data: null, error: null });
        const origInsert = c.insert as ReturnType<typeof vi.fn>;
        origInsert.mockImplementation((data: Record<string, unknown>) => {
          insertedLink = data;
          return chain({ data: null, error: null });
        });
        return c;
      }
      // update claimed
      return chain({ data: null, error: null });
    });

    const res = await POST(
      new NextRequest("http://localhost/api/family/invite/tok/accept", { method: "POST" }),
      { params: Promise.resolve({ token: "tok" }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    // Parent inviter → parentId = inviter, studentId = accepter
    expect(body.link.parentId).toBe("parent-id");
    expect(body.link.studentId).toBe("user-1");
  });

  it("returns 409 when family link already exists", async () => {
    mockGetUser.mockResolvedValue(authedUser());

    let callCount = 0;
    mockServiceFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return chain({
          data: {
            id: "inv-1",
            inviter_id: "other-user",
            inviter_type: "student",
            expires_at: "2030-01-01T00:00:00Z",
            claimed: false,
          },
        });
      }
      if (callCount === 2) {
        // family_links insert → duplicate
        return chain({ data: null, error: { code: "23505", message: "duplicate" } });
      }
      return chain({ data: null });
    });

    const res = await POST(
      new NextRequest("http://localhost/api/family/invite/tok/accept", { method: "POST" }),
      { params: Promise.resolve({ token: "tok" }) },
    );
    expect(res.status).toBe(409);
  });
});
