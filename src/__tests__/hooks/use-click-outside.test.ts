import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useRef } from "react";
import { useClickOutside } from "@/hooks/use-click-outside";

describe("useClickOutside", () => {
  let onClose: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onClose = vi.fn();
  });

  it("calls onClose when clicking outside the ref element", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    renderHook(() => {
      const ref = useRef<HTMLElement>(container);
      useClickOutside(ref, onClose, true);
    });

    // Click outside (on the body itself)
    const event = new MouseEvent("mousedown", { bubbles: true });
    document.body.dispatchEvent(event);

    expect(onClose).toHaveBeenCalledTimes(1);
    document.body.removeChild(container);
  });

  it("does NOT call onClose when clicking inside the ref element", () => {
    const container = document.createElement("div");
    const child = document.createElement("button");
    container.appendChild(child);
    document.body.appendChild(container);

    renderHook(() => {
      const ref = useRef<HTMLElement>(container);
      useClickOutside(ref, onClose, true);
    });

    const event = new MouseEvent("mousedown", { bubbles: true });
    child.dispatchEvent(event);

    expect(onClose).not.toHaveBeenCalled();
    document.body.removeChild(container);
  });

  it("calls onClose when Escape key is pressed", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    renderHook(() => {
      const ref = useRef<HTMLElement>(container);
      useClickOutside(ref, onClose, true);
    });

    const event = new KeyboardEvent("keydown", { key: "Escape", bubbles: true });
    document.dispatchEvent(event);

    expect(onClose).toHaveBeenCalledTimes(1);
    document.body.removeChild(container);
  });

  it("does NOT call onClose for other keys", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    renderHook(() => {
      const ref = useRef<HTMLElement>(container);
      useClickOutside(ref, onClose, true);
    });

    const event = new KeyboardEvent("keydown", { key: "Enter", bubbles: true });
    document.dispatchEvent(event);

    expect(onClose).not.toHaveBeenCalled();
    document.body.removeChild(container);
  });

  it("does NOT attach listeners when open is false", () => {
    const addSpy = vi.spyOn(document, "addEventListener");

    const container = document.createElement("div");
    document.body.appendChild(container);

    renderHook(() => {
      const ref = useRef<HTMLElement>(container);
      useClickOutside(ref, onClose, false);
    });

    // Should not have added mousedown or keydown
    const addedTypes = addSpy.mock.calls.map((c) => c[0]);
    expect(addedTypes).not.toContain("mousedown");
    expect(addedTypes).not.toContain("keydown");

    addSpy.mockRestore();
    document.body.removeChild(container);
  });

  it("excludes clicks on extraRefs from triggering onClose", () => {
    const container = document.createElement("div");
    const extraEl = document.createElement("div");
    document.body.appendChild(container);
    document.body.appendChild(extraEl);

    renderHook(() => {
      const ref = useRef<HTMLElement>(container);
      const extraRef = useRef<HTMLElement>(extraEl);
      useClickOutside(ref, onClose, true, [extraRef]);
    });

    // Click on the extra element — should NOT trigger close
    const event = new MouseEvent("mousedown", { bubbles: true });
    extraEl.dispatchEvent(event);

    expect(onClose).not.toHaveBeenCalled();

    document.body.removeChild(container);
    document.body.removeChild(extraEl);
  });

  it("removes listeners on cleanup", () => {
    const removeSpy = vi.spyOn(document, "removeEventListener");

    const container = document.createElement("div");
    document.body.appendChild(container);

    const { unmount } = renderHook(() => {
      const ref = useRef<HTMLElement>(container);
      useClickOutside(ref, onClose, true);
    });

    unmount();

    const removedTypes = removeSpy.mock.calls.map((c) => c[0]);
    expect(removedTypes).toContain("mousedown");
    expect(removedTypes).toContain("keydown");

    removeSpy.mockRestore();
    document.body.removeChild(container);
  });
});
