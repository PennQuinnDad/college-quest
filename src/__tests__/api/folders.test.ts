import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

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

function chain(result: { data?: unknown; error?: unknown; count?: number | null }) {
  const c: Record<string, unknown> = {};
  const methods = [
    "select", "insert", "update", "delete",
    "eq", "neq", "in", "order", "limit", "range", "head",
  ];
  for (const m of methods) {
    c[m] = vi.fn().mockReturnValue(c);
  }
  c.single = vi.fn().mockResolvedValue(result);
  c.maybeSingle = vi.fn().mockResolvedValue(result);
  c.then = (resolve: (v: unknown) => void) => resolve(result);
  return c;
}

function authedUser() {
  return {
    data: {
      user: { id: "u-1", email: "u@test.com", user_metadata: {} },
    },
  };
}

// ── Folders route ─────────────────────────────────────────────────────────────

describe("GET /api/folders", () => {
  let GET: () => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/folders/route");
    GET = mod.GET;
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns folders with camelCase fields", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    mockServiceFrom.mockReturnValue(
      chain({
        data: [
          {
            id: "f-1",
            name: "My Folder",
            color: "#ff0000",
            position: 0,
            created_at: "2025-01-01",
            updated_at: "2025-01-02",
          },
        ],
        error: null,
      }),
    );

    const res = await GET();
    const body = await res.json();
    expect(body.folders).toHaveLength(1);
    expect(body.folders[0]).toEqual({
      id: "f-1",
      name: "My Folder",
      color: "#ff0000",
      position: 0,
      createdAt: "2025-01-01",
      updatedAt: "2025-01-02",
    });
  });
});

describe("POST /api/folders", () => {
  let POST: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/folders/route");
    POST = mod.POST;
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const req = new NextRequest("http://localhost/api/folders", {
      method: "POST",
      body: JSON.stringify({ name: "Test" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 for empty folder name", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    const req = new NextRequest("http://localhost/api/folders", {
      method: "POST",
      body: JSON.stringify({ name: "  " }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/name/i);
  });

  it("returns 400 when max 20 folders reached", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    mockServiceFrom.mockReturnValue(chain({ data: null, error: null, count: 20 }));

    const req = new NextRequest("http://localhost/api/folders", {
      method: "POST",
      body: JSON.stringify({ name: "Another Folder" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/20/);
  });

  it("returns 409 for duplicate folder name", async () => {
    mockGetUser.mockResolvedValue(authedUser());

    let callCount = 0;
    mockServiceFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // count check
        return chain({ data: null, error: null, count: 5 });
      }
      if (callCount === 2) {
        // get last position
        return chain({ data: [{ position: 4 }], error: null });
      }
      // insert → duplicate
      return chain({ data: null, error: { code: "23505" } });
    });

    const req = new NextRequest("http://localhost/api/folders", {
      method: "POST",
      body: JSON.stringify({ name: "Existing" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(409);
  });

  it("returns 201 on successful creation", async () => {
    mockGetUser.mockResolvedValue(authedUser());

    let callCount = 0;
    mockServiceFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return chain({ data: null, error: null, count: 2 });
      }
      if (callCount === 2) {
        return chain({ data: [{ position: 1 }], error: null });
      }
      return chain({
        data: { id: "f-new", name: "New Folder", position: 2 },
        error: null,
      });
    });

    const req = new NextRequest("http://localhost/api/folders", {
      method: "POST",
      body: JSON.stringify({ name: "New Folder" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
  });
});

// ── Folder items ──────────────────────────────────────────────────────────────

describe("POST /api/folders/[folderId]/items", () => {
  let POST: (
    req: NextRequest,
    ctx: { params: Promise<{ folderId: string }> },
  ) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/folders/[folderId]/items/route");
    POST = mod.POST;
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const req = new NextRequest("http://localhost/api/folders/f-1/items", {
      method: "POST",
      body: JSON.stringify({ collegeId: "c-1" }),
    });
    const res = await POST(req, { params: Promise.resolve({ folderId: "f-1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 400 when collegeId is missing", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    mockServiceFrom.mockReturnValue(chain({ data: { id: "f-1" } }));

    const req = new NextRequest("http://localhost/api/folders/f-1/items", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req, { params: Promise.resolve({ folderId: "f-1" }) });
    expect(res.status).toBe(400);
  });

  it("returns 404 when folder doesn't belong to user", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    mockServiceFrom.mockReturnValue(chain({ data: null }));

    const req = new NextRequest("http://localhost/api/folders/f-999/items", {
      method: "POST",
      body: JSON.stringify({ collegeId: "c-1" }),
    });
    const res = await POST(req, { params: Promise.resolve({ folderId: "f-999" }) });
    expect(res.status).toBe(404);
  });

  it("returns 409 when item already in folder", async () => {
    mockGetUser.mockResolvedValue(authedUser());

    let callCount = 0;
    mockServiceFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // ownership check
        return chain({ data: { id: "f-1" } });
      }
      // insert → duplicate
      return chain({ data: null, error: { code: "23505" } });
    });

    const req = new NextRequest("http://localhost/api/folders/f-1/items", {
      method: "POST",
      body: JSON.stringify({ collegeId: "c-1" }),
    });
    const res = await POST(req, { params: Promise.resolve({ folderId: "f-1" }) });
    expect(res.status).toBe(409);
  });

  it("returns 201 on successful add", async () => {
    mockGetUser.mockResolvedValue(authedUser());

    let callCount = 0;
    mockServiceFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return chain({ data: { id: "f-1" } });
      }
      return chain({ data: null, error: null });
    });

    const req = new NextRequest("http://localhost/api/folders/f-1/items", {
      method: "POST",
      body: JSON.stringify({ collegeId: "c-1" }),
    });
    const res = await POST(req, { params: Promise.resolve({ folderId: "f-1" }) });
    expect(res.status).toBe(201);
  });
});

describe("DELETE /api/folders/[folderId]/items", () => {
  let DELETE: (
    req: NextRequest,
    ctx: { params: Promise<{ folderId: string }> },
  ) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/folders/[folderId]/items/route");
    DELETE = mod.DELETE;
  });

  it("returns 400 when collegeId query param is missing", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    const req = new NextRequest("http://localhost/api/folders/f-1/items", {
      method: "DELETE",
    });
    const res = await DELETE(req, { params: Promise.resolve({ folderId: "f-1" }) });
    expect(res.status).toBe(400);
  });

  it("returns 404 when folder doesn't belong to user", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    mockServiceFrom.mockReturnValue(chain({ data: null }));

    const req = new NextRequest(
      "http://localhost/api/folders/f-1/items?collegeId=c-1",
      { method: "DELETE" },
    );
    const res = await DELETE(req, { params: Promise.resolve({ folderId: "f-1" }) });
    expect(res.status).toBe(404);
  });
});

// ── Folder PATCH/DELETE ───────────────────────────────────────────────────────

describe("DELETE /api/folders/[folderId]", () => {
  let DELETE: (
    req: NextRequest,
    ctx: { params: Promise<{ folderId: string }> },
  ) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/folders/[folderId]/route");
    DELETE = mod.DELETE;
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await DELETE(
      new NextRequest("http://localhost/api/folders/f-1", { method: "DELETE" }),
      { params: Promise.resolve({ folderId: "f-1" }) },
    );
    expect(res.status).toBe(401);
  });

  it("deletes folder items then folder", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    mockServiceFrom.mockReturnValue(chain({ data: null, error: null }));

    const res = await DELETE(
      new NextRequest("http://localhost/api/folders/f-1", { method: "DELETE" }),
      { params: Promise.resolve({ folderId: "f-1" }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toMatch(/deleted/i);
    // Verify from() was called for both folder_items and folders
    expect(mockServiceFrom).toHaveBeenCalledWith("favorite_folder_items");
    expect(mockServiceFrom).toHaveBeenCalledWith("favorite_folders");
  });
});
