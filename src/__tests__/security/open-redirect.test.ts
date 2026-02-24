import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockExchangeCodeForSession = vi.fn();
const mockGetUser = vi.fn();
const mockSignOut = vi.fn();
const mockServiceFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      exchangeCodeForSession: (...args: unknown[]) => mockExchangeCodeForSession(...args),
      getUser: () => mockGetUser(),
      signOut: () => mockSignOut(),
    },
  }),
  createServiceClient: () => ({
    from: (...args: unknown[]) => mockServiceFrom(...args),
  }),
}));

function chain(result: { data?: unknown; error?: unknown }) {
  const c: Record<string, unknown> = {};
  const methods = ["select", "eq", "ilike", "limit", "upsert", "insert", "update"];
  for (const m of methods) {
    c[m] = vi.fn().mockReturnValue(c);
  }
  c.single = vi.fn().mockResolvedValue(result);
  c.maybeSingle = vi.fn().mockResolvedValue(result);
  c.then = (resolve: (v: unknown) => void) => resolve(result);
  return c;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("Open redirect prevention - /auth/callback", () => {
  let GET: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset env
    delete process.env.TRUSTED_HOSTS;
    const mod = await import("@/app/auth/callback/route");
    GET = mod.GET;
  });

  function makeCallbackRequest(params: Record<string, string>, headers?: Record<string, string>) {
    const url = new URL("http://localhost/auth/callback");
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
    return new NextRequest(url, { headers });
  }

  function setupSuccessfulAuth() {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u-1", email: "test@test.com", user_metadata: {} } },
    });

    let callCount = 0;
    mockServiceFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // allowed_emails check
        return chain({ data: [{ id: "ae-1", suggested_account_type: "student" }] });
      }
      if (callCount === 2) {
        // profiles upsert
        return chain({ data: null });
      }
      // profile_completed check
      return chain({ data: { profile_completed: true } });
    });
  }

  it("blocks protocol-relative redirect (//evil.com)", async () => {
    setupSuccessfulAuth();

    const res = await GET(makeCallbackRequest({ code: "valid-code", next: "//evil.com" }));
    const location = res.headers.get("location") || "";

    // Should redirect to "/" not "//evil.com"
    expect(location).not.toContain("evil.com");
    expect(location).toMatch(/http:\/\/localhost\/$/);
  });

  it("blocks absolute URL redirect (https://evil.com)", async () => {
    setupSuccessfulAuth();

    const res = await GET(makeCallbackRequest({ code: "valid-code", next: "https://evil.com" }));
    const location = res.headers.get("location") || "";

    expect(location).not.toContain("evil.com");
  });

  it("blocks backslash-escaped redirect (/\\evil.com)", async () => {
    setupSuccessfulAuth();

    const res = await GET(makeCallbackRequest({ code: "valid-code", next: "/\\evil.com" }));
    const location = res.headers.get("location") || "";

    expect(location).not.toContain("evil.com");
  });

  it("blocks redirect with embedded protocol (//evil.com://)", async () => {
    setupSuccessfulAuth();

    const res = await GET(makeCallbackRequest({ code: "valid-code", next: "/redirect://evil.com" }));
    const location = res.headers.get("location") || "";

    // Should fall back to "/"
    expect(location).not.toContain("evil.com");
  });

  it("allows valid relative path redirect (/dashboard)", async () => {
    setupSuccessfulAuth();

    const res = await GET(makeCallbackRequest({ code: "valid-code", next: "/dashboard" }));
    const location = res.headers.get("location") || "";

    expect(location).toContain("/dashboard");
  });

  it("defaults to / when next param is missing", async () => {
    setupSuccessfulAuth();

    const res = await GET(makeCallbackRequest({ code: "valid-code" }));
    const location = res.headers.get("location") || "";

    expect(location).toMatch(/http:\/\/localhost\/$/);
  });
});

describe("X-Forwarded-Host validation - /auth/callback", () => {
  let GET: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    delete process.env.TRUSTED_HOSTS;
    delete process.env.NODE_ENV;
    const mod = await import("@/app/auth/callback/route");
    GET = mod.GET;
  });

  it("ignores x-forwarded-host when TRUSTED_HOSTS is not configured", async () => {
    // No TRUSTED_HOSTS env var set
    mockExchangeCodeForSession.mockResolvedValue({ error: new Error("bad code") });

    const url = new URL("http://localhost/auth/callback");
    url.searchParams.set("code", "test");
    const req = new NextRequest(url, {
      headers: { "x-forwarded-host": "evil.com", "x-forwarded-proto": "https" },
    });

    const res = await GET(req);
    const location = res.headers.get("location") || "";

    // Should use origin (localhost), NOT the forwarded host
    expect(location).not.toContain("evil.com");
    expect(location).toContain("localhost");
  });

  it("uses x-forwarded-host only when it matches TRUSTED_HOSTS", async () => {
    process.env.TRUSTED_HOSTS = "myapp.com,staging.myapp.com";
    mockExchangeCodeForSession.mockResolvedValue({ error: new Error("bad") });

    const url = new URL("http://localhost/auth/callback");
    url.searchParams.set("code", "test");
    const req = new NextRequest(url, {
      headers: { "x-forwarded-host": "evil.com", "x-forwarded-proto": "https" },
    });

    const res = await GET(req);
    const location = res.headers.get("location") || "";

    // evil.com is not in TRUSTED_HOSTS, should fallback to origin
    expect(location).not.toContain("evil.com");
  });
});

describe("X-Forwarded-Host validation - /auth/signout", () => {
  let GET: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    delete process.env.TRUSTED_HOSTS;
    const mod = await import("@/app/auth/signout/route");
    GET = mod.GET;
  });

  it("ignores x-forwarded-host when TRUSTED_HOSTS is not configured", async () => {
    mockSignOut.mockResolvedValue(undefined);

    const req = new NextRequest("http://localhost/auth/signout", {
      headers: { "x-forwarded-host": "evil.com", "x-forwarded-proto": "https" },
    });

    const res = await GET(req);
    const location = res.headers.get("location") || "";

    expect(location).not.toContain("evil.com");
    expect(location).toContain("localhost");
  });
});
