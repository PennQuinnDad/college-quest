import { describe, it, expect, vi, beforeEach } from "vitest";

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
  ["select", "eq", "maybeSingle"].forEach((m) => {
    c[m] = vi.fn().mockReturnValue(c);
  });
  c.maybeSingle = vi.fn().mockResolvedValue(result);
  return c;
}

describe("verifyAdmin", () => {
  let verifyAdmin: () => Promise<Response | null>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/lib/admin-auth");
    verifyAdmin = mod.verifyAdmin as () => Promise<Response | null>;
  });

  it("returns 401 when no user is authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await verifyAdmin();
    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
  });

  it("returns 403 when user is not admin", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    mockServiceFrom.mockReturnValue(
      chain({ data: { role: "user" } }),
    );

    const result = await verifyAdmin();
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it("returns null (pass) when user is admin", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "admin-1" } },
    });
    mockServiceFrom.mockReturnValue(
      chain({ data: { role: "admin" } }),
    );

    const result = await verifyAdmin();
    expect(result).toBeNull();
  });

  it("returns 403 when profile has no role", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    mockServiceFrom.mockReturnValue(
      chain({ data: { role: null } }),
    );

    const result = await verifyAdmin();
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it("returns 403 when profile doesn't exist", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    mockServiceFrom.mockReturnValue(
      chain({ data: null }),
    );

    const result = await verifyAdmin();
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });
});
