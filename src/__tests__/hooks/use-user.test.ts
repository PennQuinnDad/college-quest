import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createWrapper } from "../helpers/render-hook";
import { useUser } from "@/hooks/use-user";

const originalFetch = global.fetch;

beforeEach(() => {
  global.fetch = vi.fn();
});

afterEach(() => {
  global.fetch = originalFetch;
});

describe("useUser", () => {
  it("returns user profile on success", async () => {
    const profile = {
      id: "u-1",
      email: "user@test.com",
      displayName: "Test User",
      role: "user",
      accountType: "student",
      graduationYear: 2027,
      highSchool: "Test High",
      profileCompleted: true,
      avatarUrl: null,
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => profile,
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useUser(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(profile);
  });

  it("returns null when not authenticated", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: "Unauthorized" }),
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useUser(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it("does not retry on failure", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "Server error" }),
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useUser(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // Should have been called only once (no retries)
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("fetches from /api/me", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ id: "u-1" }),
    });

    const { Wrapper } = createWrapper();
    renderHook(() => useUser(), { wrapper: Wrapper });

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(global.fetch).toHaveBeenCalledWith("/api/me");
  });
});
