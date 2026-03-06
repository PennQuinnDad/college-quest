import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockSend = vi.fn();

vi.mock("resend", () => ({
  Resend: class MockResend {
    emails = { send: (...args: unknown[]) => mockSend(...args) };
  },
}));

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("sendFamilyInviteEmail", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = "re_test_key";
    // Reset module cache so the `resend` client re-initializes
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  async function importFn() {
    const mod = await import("@/lib/email");
    return mod.sendFamilyInviteEmail;
  }

  const baseOpts = {
    to: "student@test.com",
    inviterName: "Dad",
    inviterType: "parent" as const,
    token: "abc-123",
    expiresAt: "2026-03-01T00:00:00Z",
  };

  it("sends an email via Resend", async () => {
    mockSend.mockResolvedValue({ data: { id: "email-1" }, error: null });
    const sendFamilyInviteEmail = await importFn();
    await sendFamilyInviteEmail(baseOpts);

    expect(mockSend).toHaveBeenCalledOnce();
    const call = mockSend.mock.calls[0][0];
    expect(call.to).toBe("student@test.com");
    expect(call.from).toContain("College Quest");
    expect(call.subject).toContain("Dad");
    expect(call.html).toContain("/invite/abc-123");
  });

  it("includes correct invite URL with NEXT_PUBLIC_SITE_URL", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://custom.example.com";
    mockSend.mockResolvedValue({ data: { id: "email-1" }, error: null });
    const sendFamilyInviteEmail = await importFn();
    await sendFamilyInviteEmail(baseOpts);

    const call = mockSend.mock.calls[0][0];
    expect(call.html).toContain("https://custom.example.com/invite/abc-123");
  });

  it("falls back to localhost in development", async () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NODE_ENV = "development";
    mockSend.mockResolvedValue({ data: { id: "email-1" }, error: null });
    const sendFamilyInviteEmail = await importFn();
    await sendFamilyInviteEmail(baseOpts);

    const call = mockSend.mock.calls[0][0];
    expect(call.html).toContain("http://localhost:3000/invite/abc-123");
  });

  it("uses fallback sender label when inviterName is null", async () => {
    mockSend.mockResolvedValue({ data: { id: "email-1" }, error: null });
    const sendFamilyInviteEmail = await importFn();
    await sendFamilyInviteEmail({ ...baseOpts, inviterName: null });

    const call = mockSend.mock.calls[0][0];
    expect(call.subject).toContain("A parent");
  });

  it("uses 'A student' label when student invites with null name", async () => {
    mockSend.mockResolvedValue({ data: { id: "email-1" }, error: null });
    const sendFamilyInviteEmail = await importFn();
    await sendFamilyInviteEmail({
      ...baseOpts,
      inviterName: null,
      inviterType: "student",
    });

    const call = mockSend.mock.calls[0][0];
    expect(call.subject).toContain("A student");
  });

  it("does not throw when Resend returns an error", async () => {
    mockSend.mockRejectedValue(new Error("Resend API error"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const sendFamilyInviteEmail = await importFn();

    await expect(sendFamilyInviteEmail(baseOpts)).resolves.toBeUndefined();
    expect(consoleError).toHaveBeenCalledWith(
      "Failed to send invite email:",
      expect.any(Error),
    );
    consoleError.mockRestore();
  });

  it("skips sending when RESEND_API_KEY is not set", async () => {
    delete process.env.RESEND_API_KEY;
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const sendFamilyInviteEmail = await importFn();
    await sendFamilyInviteEmail(baseOpts);

    expect(mockSend).not.toHaveBeenCalled();
    expect(consoleWarn).toHaveBeenCalledWith(
      expect.stringContaining("RESEND_API_KEY not set"),
    );
    consoleWarn.mockRestore();
  });
});
