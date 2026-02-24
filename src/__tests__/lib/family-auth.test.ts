import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockServiceFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: () => ({
    from: (...args: unknown[]) => mockServiceFrom(...args),
  }),
}));

// ── Helpers ────────────────────────────────────────────────────────────────────

function chain(terminalResult: { data?: unknown; error?: unknown }) {
  const c: Record<string, unknown> = {};
  const methods = ["select", "eq", "maybeSingle"];
  for (const m of methods) {
    c[m] = vi.fn().mockReturnValue(c);
  }
  c.maybeSingle = vi.fn().mockResolvedValue(terminalResult);
  return c;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("verifyParentAccess", () => {
  let verifyParentAccess: typeof import("@/lib/family-auth").verifyParentAccess;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/lib/family-auth");
    verifyParentAccess = mod.verifyParentAccess;
  });

  it("returns null when no active link exists", async () => {
    mockServiceFrom.mockReturnValue(chain({ data: null }));
    const result = await verifyParentAccess("parent-1", "student-1");
    expect(result).toBeNull();
  });

  it("returns link when active link exists with no permission check", async () => {
    const link = {
      id: "link-1",
      parent_id: "parent-1",
      student_id: "student-1",
      can_view_favorites: true,
      can_view_folders: true,
      can_view_activity: true,
    };
    mockServiceFrom.mockReturnValue(chain({ data: link }));
    const result = await verifyParentAccess("parent-1", "student-1");
    expect(result).toEqual(link);
  });

  it("returns null when permission is denied", async () => {
    const link = {
      id: "link-1",
      parent_id: "parent-1",
      student_id: "student-1",
      can_view_favorites: false,
      can_view_folders: true,
      can_view_activity: true,
    };
    mockServiceFrom.mockReturnValue(chain({ data: link }));
    const result = await verifyParentAccess("parent-1", "student-1", "can_view_favorites");
    expect(result).toBeNull();
  });

  it("returns link when permission is granted", async () => {
    const link = {
      id: "link-1",
      parent_id: "parent-1",
      student_id: "student-1",
      can_view_favorites: true,
      can_view_folders: true,
      can_view_activity: false,
    };
    mockServiceFrom.mockReturnValue(chain({ data: link }));
    const result = await verifyParentAccess("parent-1", "student-1", "can_view_folders");
    expect(result).toEqual(link);
  });
});
