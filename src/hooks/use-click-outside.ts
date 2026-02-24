"use client";

import { useEffect, type RefObject } from "react";

/**
 * Closes a dropdown/popover when clicking outside the ref element or pressing Escape.
 * Only attaches listeners when `open` is true.
 *
 * @param ref - React ref for the container element
 * @param onClose - Callback to close the dropdown
 * @param open - Whether the dropdown is currently open
 * @param extraRefs - Optional additional refs to exclude from outside-click detection
 */
export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  onClose: () => void,
  open: boolean,
  extraRefs?: RefObject<HTMLElement | null>[]
) {
  useEffect(() => {
    if (!open) return;

    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (ref.current && !ref.current.contains(target)) {
        // Check if click is inside any extra ref
        if (extraRefs?.some((r) => r.current?.contains(target))) return;
        onClose();
      }
    }

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [ref, onClose, open, extraRefs]);
}
