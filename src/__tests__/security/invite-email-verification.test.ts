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

function chain(result: { data?: unknown; error?: unknown }) {
  const c: Record<string, unknown> = {};
  const methods = ["select", "eq", "neq", "insert", "update", "maybeSingle", "single"];
  for (const m of methods) {
    c[m] = vi.fn().mockReturnValue(c);
  }
  c.maybeSingle = vi.fn().mockResolvedValue(result);
  c.single = vi.fn().mockResolvedValue(result);
  c.then = (resolve: (v: unknown) => void) => resolve(result);
  return c;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("Invite accept - email verification", () => {
  let POST: (
    req: NextRequest,
    ctx: { params: Promise<{ token: string }> },
  ) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/family/invite/[token]/accept/route");
    POST = mod.POST;
  });

  function makeAcceptRequest() {
    return new NextRequest("http://localhost/api/family/invite/tok/accept", {
      method: "POST",
    });
  }

  it("returns 403 when accepter email doesn't match invited_email", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-2", email: "wrong@example.com" } },
    });

    mockServiceFrom.mockReturnValue(
      chain({
        data: {
          id: "inv-1",
          inviter_id: "user-1",
          inviter_type: "parent",
          invited_email: "correct@example.com",
          expires_at: "2030-01-01T00:00:00Z",
          claimed: false,
        },
      }),
    );

    const res = await POST(makeAcceptRequest(), {
      params: Promise.resolve({ token: "tok" }),
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/different email/i);
  });

  it("allows accept when email matches (case-insensitive)", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-2", email: "Correct@Example.COM" } },
    });

    let callCount = 0;
    mockServiceFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return chain({
          data: {
            id: "inv-1",
            inviter_id: "user-1",
            inviter_type: "parent",
            invited_email: "correct@example.com",
            expires_at: "2030-01-01T00:00:00Z",
            claimed: false,
          },
        });
      }
      // family_links insert and update claimed
      return chain({ data: null, error: null });
    });

    const res = await POST(makeAcceptRequest(), {
      params: Promise.resolve({ token: "tok" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toMatch(/success/i);
  });

  it("allows accept when invited_email is null (legacy invites)", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-2", email: "anyone@example.com" } },
    });

    let callCount = 0;
    mockServiceFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return chain({
          data: {
            id: "inv-1",
            inviter_id: "user-1",
            inviter_type: "parent",
            invited_email: null, // no email stored
            expires_at: "2030-01-01T00:00:00Z",
            claimed: false,
          },
        });
      }
      return chain({ data: null, error: null });
    });

    const res = await POST(makeAcceptRequest(), {
      params: Promise.resolve({ token: "tok" }),
    });
    expect(res.status).toBe(200);
  });
});
