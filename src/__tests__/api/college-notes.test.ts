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

function authedUser(id = "user-1", email = "user@test.com") {
  return {
    data: { user: { id, email, user_metadata: { full_name: "Test User" } } },
  };
}

function makePostRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/colleges/college-1/notes", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/colleges/[collegeId]/notes", () => {
  let POST: (
    req: NextRequest,
    ctx: { params: Promise<{ collegeId: string }> },
  ) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/colleges/[id]/notes/route");
    POST = mod.POST;
  });

  const ctx = { params: Promise.resolve({ collegeId: "college-1" }) };

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(makePostRequest({ content: "hello" }), ctx);
    expect(res.status).toBe(401);
  });

  it("returns 400 for empty content", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    const res = await POST(makePostRequest({ content: "" }), ctx);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/content/i);
  });

  it("returns 400 for content exceeding 2000 chars", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    const res = await POST(
      makePostRequest({ content: "x".repeat(2001) }),
      ctx,
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/2000/);
  });

  it("returns 400 for invalid visibility", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    const res = await POST(
      makePostRequest({ content: "test", visibility: "public" }),
      ctx,
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/visibility/i);
  });

  it("creates a note successfully", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    let callCount = 0;
    mockServiceFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // insert note
        return chain({
          data: {
            id: "note-1",
            college_id: "college-1",
            user_id: "user-1",
            content: "Great school!",
            visibility: "family",
            created_at: "2026-02-24T00:00:00Z",
            updated_at: "2026-02-24T00:00:00Z",
          },
        });
      }
      // get profile display_name
      return chain({ data: { display_name: "Test User" } });
    });

    const res = await POST(
      makePostRequest({ content: "Great school!" }),
      ctx,
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.content).toBe("Great school!");
    expect(body.userName).toBe("Test User");
    expect(body.visibility).toBe("family");
  });
});

describe("DELETE /api/colleges/[collegeId]/notes", () => {
  let DELETE: (
    req: NextRequest,
    ctx: { params: Promise<{ collegeId: string }> },
  ) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/colleges/[id]/notes/route");
    DELETE = mod.DELETE;
  });

  const ctx = { params: Promise.resolve({ collegeId: "college-1" }) };

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await DELETE(
      new NextRequest("http://localhost/api/colleges/college-1/notes?noteId=n1", {
        method: "DELETE",
      }),
      ctx,
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when noteId is missing", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    const res = await DELETE(
      new NextRequest("http://localhost/api/colleges/college-1/notes", {
        method: "DELETE",
      }),
      ctx,
    );
    expect(res.status).toBe(400);
  });

  it("deletes a note successfully", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    mockServiceFrom.mockReturnValue(chain({ data: null, error: null }));

    const res = await DELETE(
      new NextRequest("http://localhost/api/colleges/college-1/notes?noteId=note-1", {
        method: "DELETE",
      }),
      ctx,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toMatch(/deleted/i);
  });
});
