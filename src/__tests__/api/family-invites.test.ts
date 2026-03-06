import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockServiceFrom = vi.fn();
const mockSendFamilyInviteEmail = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
  }),
  createServiceClient: () => ({
    from: (...args: unknown[]) => mockServiceFrom(...args),
  }),
}));

vi.mock("@/lib/email", () => ({
  sendFamilyInviteEmail: (...args: unknown[]) => mockSendFamilyInviteEmail(...args),
}));

// ── Helpers ────────────────────────────────────────────────────────────────────

function chain(terminalResult: { data?: unknown; error?: unknown }) {
  const c: Record<string, unknown> = {};
  const methods = [
    "select", "eq", "neq", "insert", "upsert", "update", "delete",
    "ilike", "order", "maybeSingle", "single",
  ];
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

// ── Tests: POST /api/family/invites (resend email) ────────────────────────────

describe("POST /api/family/invites (resend invite email)", () => {
  let POST: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/family/invites/route");
    POST = mod.POST;
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await POST(
      new NextRequest("http://localhost/api/family/invites", {
        method: "POST",
        body: JSON.stringify({ inviteId: "inv-1" }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when inviteId is missing", async () => {
    mockGetUser.mockResolvedValue(authedUser());

    const res = await POST(
      new NextRequest("http://localhost/api/family/invites", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/inviteId/i);
  });

  it("returns 404 when invite not found", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    mockServiceFrom.mockReturnValue(chain({ data: null, error: null }));

    const res = await POST(
      new NextRequest("http://localhost/api/family/invites", {
        method: "POST",
        body: JSON.stringify({ inviteId: "nonexistent" }),
      }),
    );
    expect(res.status).toBe(404);
  });

  it("returns 410 when invite has expired", async () => {
    mockGetUser.mockResolvedValue(authedUser());

    let callCount = 0;
    mockServiceFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // invite lookup → found but expired
        return chain({
          data: {
            id: "inv-1",
            inviter_type: "parent",
            invited_email: "child@test.com",
            token: "tok-abc",
            expires_at: "2020-01-01T00:00:00Z", // expired
            claimed: false,
          },
        });
      }
      return chain({ data: null });
    });

    const res = await POST(
      new NextRequest("http://localhost/api/family/invites", {
        method: "POST",
        body: JSON.stringify({ inviteId: "inv-1" }),
      }),
    );
    expect(res.status).toBe(410);
    const body = await res.json();
    expect(body.error).toMatch(/expired/i);
  });

  it("resends email and returns 200 on success", async () => {
    mockGetUser.mockResolvedValue(authedUser());

    let callCount = 0;
    mockServiceFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // invite lookup → valid invite
        return chain({
          data: {
            id: "inv-1",
            inviter_type: "parent",
            invited_email: "child@test.com",
            token: "tok-abc",
            expires_at: "2030-01-01T00:00:00Z",
            claimed: false,
          },
        });
      }
      if (callCount === 2) {
        // profile lookup
        return chain({ data: { display_name: "Dad" } });
      }
      return chain({ data: null });
    });

    const res = await POST(
      new NextRequest("http://localhost/api/family/invites", {
        method: "POST",
        body: JSON.stringify({ inviteId: "inv-1" }),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toMatch(/resent/i);

    expect(mockSendFamilyInviteEmail).toHaveBeenCalledOnce();
    expect(mockSendFamilyInviteEmail).toHaveBeenCalledWith({
      to: "child@test.com",
      inviterName: "Dad",
      inviterType: "parent",
      token: "tok-abc",
      expiresAt: "2030-01-01T00:00:00Z",
    });
  });

  it("uses null inviterName when profile has no display_name", async () => {
    mockGetUser.mockResolvedValue(authedUser());

    let callCount = 0;
    mockServiceFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return chain({
          data: {
            id: "inv-1",
            inviter_type: "student",
            invited_email: "parent@test.com",
            token: "tok-xyz",
            expires_at: "2030-01-01T00:00:00Z",
            claimed: false,
          },
        });
      }
      if (callCount === 2) {
        return chain({ data: { display_name: null } });
      }
      return chain({ data: null });
    });

    const res = await POST(
      new NextRequest("http://localhost/api/family/invites", {
        method: "POST",
        body: JSON.stringify({ inviteId: "inv-1" }),
      }),
    );
    expect(res.status).toBe(200);

    expect(mockSendFamilyInviteEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        inviterName: null,
        inviterType: "student",
      }),
    );
  });
});

// ── Tests: GET /api/family/invites ────────────────────────────────────────────

describe("GET /api/family/invites", () => {
  let GET: () => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/family/invites/route");
    GET = mod.GET;
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns sent and received invites", async () => {
    mockGetUser.mockResolvedValue(authedUser());

    let callCount = 0;
    mockServiceFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // sent invites
        const c = chain({ data: [] });
        c.then = (resolve: (v: unknown) => void) =>
          resolve({
            data: [
              {
                id: "s1",
                inviter_type: "parent",
                invited_email: "child@test.com",
                token: "tok-1",
                expires_at: "2030-01-01T00:00:00Z",
                claimed: false,
                created_at: "2026-02-01T00:00:00Z",
              },
            ],
            error: null,
          });
        return c;
      }
      if (callCount === 2) {
        // received invites
        const c = chain({ data: [] });
        c.then = (resolve: (v: unknown) => void) =>
          resolve({ data: [], error: null });
        return c;
      }
      return chain({ data: null });
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toHaveLength(1);
    expect(body.sent[0].invitedEmail).toBe("child@test.com");
    expect(body.received).toHaveLength(0);
  });
});

// ── Tests: DELETE /api/family/invites ──────────────────────────────────────────

describe("DELETE /api/family/invites", () => {
  let DELETE: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/family/invites/route");
    DELETE = mod.DELETE;
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await DELETE(
      new NextRequest("http://localhost/api/family/invites?id=inv-1", {
        method: "DELETE",
      }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when id is missing", async () => {
    mockGetUser.mockResolvedValue(authedUser());

    const res = await DELETE(
      new NextRequest("http://localhost/api/family/invites", {
        method: "DELETE",
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/id/i);
  });

  it("deletes invite and returns success", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    const c = chain({ data: null, error: null });
    c.then = (resolve: (v: unknown) => void) =>
      resolve({ data: null, error: null });
    mockServiceFrom.mockReturnValue(c);

    const res = await DELETE(
      new NextRequest("http://localhost/api/family/invites?id=inv-1", {
        method: "DELETE",
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toMatch(/deleted/i);
  });
});
