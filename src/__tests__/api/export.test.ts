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

// ── Tests ───────────────────────────────────────────────────────────────────────

describe("GET /api/export", () => {
  let GET: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/export/route");
    GET = mod.GET;
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await GET(
      new NextRequest("http://localhost/api/export?type=favorites"),
    );
    expect(res.status).toBe(401);
  });

  it("returns CSV for favorites export", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    let callIndex = 0;
    mockServiceFrom.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) {
        // favorites query
        const c = chain({ data: [{ college_id: "c1" }] });
        c.then = (resolve: (v: unknown) => void) =>
          resolve({ data: [{ college_id: "c1" }], error: null });
        return c;
      }
      // colleges query
      const c = chain({ data: [] });
      c.then = (resolve: (v: unknown) => void) =>
        resolve({
          data: [{
            name: "Test University",
            city: "Boston",
            state: "MA",
            type: "Private",
            size: "Medium",
            tuition_in_state: 30000,
            tuition_out_of_state: 45000,
            acceptance_rate: 0.35,
            enrollment: 10000,
            website: "https://test.edu",
          }],
          error: null,
        });
      return c;
    });

    const res = await GET(
      new NextRequest("http://localhost/api/export?type=favorites"),
    );
    expect(res.status).toBe(200);
    const contentType = res.headers.get("Content-Type");
    expect(contentType).toContain("text/csv");
    const text = await res.text();
    expect(text).toContain("Test University");
    expect(text).toContain("Boston");
  });

  it("returns CSV for applications export", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    let callIndex = 0;
    mockServiceFrom.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) {
        // applications query
        const c = chain({ data: [] });
        c.then = (resolve: (v: unknown) => void) =>
          resolve({
            data: [{
              college_id: "c1",
              status: "applied",
              application_type: "regular",
              deadline: "2026-03-15",
              submitted_at: "2026-01-10",
              decision_at: null,
              notes: "Applied to engineering program",
            }],
            error: null,
          });
        return c;
      }
      // colleges query
      const c = chain({ data: [] });
      c.then = (resolve: (v: unknown) => void) =>
        resolve({
          data: [{ id: "c1", name: "Test University" }],
          error: null,
        });
      return c;
    });

    const res = await GET(
      new NextRequest("http://localhost/api/export?type=applications"),
    );
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("Test University");
    expect(text).toContain("applied");
  });

  it("returns empty CSV when no favorites", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    const c = chain({ data: [] });
    c.then = (resolve: (v: unknown) => void) =>
      resolve({ data: [], error: null });
    mockServiceFrom.mockReturnValue(c);

    const res = await GET(
      new NextRequest("http://localhost/api/export?type=favorites"),
    );
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("Name,City,State");
  });
});
