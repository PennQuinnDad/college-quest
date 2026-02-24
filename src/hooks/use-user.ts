"use client";

import { useQuery } from "@tanstack/react-query";
import type { UserProfile } from "@/lib/types";

/**
 * Fetches the current authenticated user via /api/me.
 * Returns `null` when not logged in.
 */
export function useUser() {
  return useQuery<UserProfile | null>({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await fetch("/api/me");
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes — user session rarely changes mid-session
  });
}
