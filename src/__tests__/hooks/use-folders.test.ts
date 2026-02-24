import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { createWrapper } from "../helpers/render-hook";
import {
  useFolders,
  useFolderMemberships,
  useToggleFolderItem,
  useCreateFolder,
} from "@/hooks/use-folders";
import type { Folder } from "@/lib/types";

// ── Global fetch mock ──────────────────────────────────────────────────────────
const originalFetch = global.fetch;

beforeEach(() => {
  global.fetch = vi.fn();
});

afterEach(() => {
  global.fetch = originalFetch;
});

function mockFetch(responses: Record<string, { ok: boolean; status?: number; body: unknown }>) {
  (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
    async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      for (const [pattern, response] of Object.entries(responses)) {
        if (url.includes(pattern)) {
          return {
            ok: response.ok,
            status: response.status ?? (response.ok ? 200 : 500),
            json: async () => response.body,
          };
        }
      }
      return { ok: false, status: 404, json: async () => ({}) };
    },
  );
}

const testFolders: Folder[] = [
  { id: "f-1", name: "Favorites", color: "#ff0000", position: 0, createdAt: "2025-01-01", updatedAt: "2025-01-01" },
  { id: "f-2", name: "Reach", color: "#00ff00", position: 1, createdAt: "2025-01-02", updatedAt: "2025-01-02" },
];

// ── useFolders ─────────────────────────────────────────────────────────────────

describe("useFolders", () => {
  it("returns folders when user is authenticated", async () => {
    mockFetch({
      "/api/folders": { ok: true, body: { folders: testFolders } },
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useFolders({ id: "user-1" }), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(testFolders);
  });

  it("does not fetch when user is null", () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useFolders(null), {
      wrapper: Wrapper,
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns empty array on API error", async () => {
    mockFetch({
      "/api/folders": { ok: false, status: 500, body: { error: "fail" } },
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useFolders({ id: "user-1" }), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});

// ── useFolderMemberships ───────────────────────────────────────────────────────

describe("useFolderMemberships", () => {
  it("builds college-to-folder map from folder items", async () => {
    mockFetch({
      "/api/folders/f-1/items": { ok: true, body: { items: ["c-1", "c-2"] } },
      "/api/folders/f-2/items": { ok: true, body: { items: ["c-2", "c-3"] } },
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useFolderMemberships({ id: "user-1" }, testFolders),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const map = result.current.data!;
    expect(map.get("c-1")).toEqual(new Set(["f-1"]));
    expect(map.get("c-2")).toEqual(new Set(["f-1", "f-2"]));
    expect(map.get("c-3")).toEqual(new Set(["f-2"]));
  });

  it("returns empty map when folders is empty", async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useFolderMemberships({ id: "user-1" }, []),
      { wrapper: Wrapper },
    );

    // Should be idle since enabled is false
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("does not fetch when user is null", () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useFolderMemberships(null, testFolders),
      { wrapper: Wrapper },
    );

    expect(result.current.fetchStatus).toBe("idle");
  });

  it("handles API errors gracefully for individual folders", async () => {
    mockFetch({
      "/api/folders/f-1/items": { ok: true, body: { items: ["c-1"] } },
      "/api/folders/f-2/items": { ok: false, status: 500, body: {} },
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useFolderMemberships({ id: "user-1" }, testFolders),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const map = result.current.data!;
    // f-1 items should be there, f-2 had error so no items
    expect(map.get("c-1")).toEqual(new Set(["f-1"]));
    expect(map.has("c-3")).toBe(false);
  });
});

// ── useToggleFolderItem ────────────────────────────────────────────────────────

describe("useToggleFolderItem", () => {
  it("sends POST for add action", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ message: "added" }),
    });

    const { Wrapper, queryClient } = createWrapper();
    const { result } = renderHook(() => useToggleFolderItem(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync({
        folderId: "f-1",
        collegeId: "c-1",
        action: "add",
      });
    });

    const [url, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain("/api/folders/f-1/items");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({ collegeId: "c-1" });
  });

  it("sends DELETE for remove action", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ message: "removed" }),
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useToggleFolderItem(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync({
        folderId: "f-1",
        collegeId: "c-1",
        action: "remove",
      });
    });

    const [url, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain("/api/folders/f-1/items?collegeId=c-1");
    expect(options.method).toBe("DELETE");
  });

  it("does not throw on 409 conflict for add", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ message: "already exists" }),
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useToggleFolderItem(), {
      wrapper: Wrapper,
    });

    // Should not throw — 409 is handled gracefully
    await act(async () => {
      await expect(
        result.current.mutateAsync({
          folderId: "f-1",
          collegeId: "c-1",
          action: "add",
        }),
      ).resolves.not.toThrow();
    });
  });

  it("throws on non-409 error for add", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "server error" }),
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useToggleFolderItem(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await expect(
        result.current.mutateAsync({
          folderId: "f-1",
          collegeId: "c-1",
          action: "add",
        }),
      ).rejects.toThrow("Failed to add to folder");
    });
  });
});

// ── useCreateFolder ────────────────────────────────────────────────────────────

describe("useCreateFolder", () => {
  it("sends POST with folder name", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ id: "f-new", name: "My Folder" }),
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateFolder(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      const data = await result.current.mutateAsync({ name: "My Folder" });
      expect(data.name).toBe("My Folder");
    });

    const [url, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("/api/folders");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({ name: "My Folder" });
  });

  it("throws with error message from API", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: "Maximum of 20 folders allowed" }),
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateFolder(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await expect(
        result.current.mutateAsync({ name: "Too Many" }),
      ).rejects.toThrow("Maximum of 20 folders allowed");
    });
  });
});
