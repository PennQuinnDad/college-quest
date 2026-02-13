"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Folder } from "@/lib/types";

export function useFolders(user: unknown) {
  return useQuery<Folder[]>({
    queryKey: ["folders"],
    queryFn: async () => {
      const res = await fetch("/api/folders");
      if (!res.ok) return [];
      const data = await res.json();
      return data.folders || [];
    },
    enabled: !!user,
  });
}

export function useFolderMemberships(user: unknown, folders: Folder[] | undefined) {
  return useQuery<Map<string, Set<string>>>({
    queryKey: ["folder-memberships", folders?.map((f) => f.id)],
    queryFn: async () => {
      if (!folders || folders.length === 0) return new Map();
      const results = await Promise.all(
        folders.map(async (folder) => {
          const res = await fetch(`/api/folders/${folder.id}/items`);
          if (!res.ok) return { folderId: folder.id, items: [] as string[] };
          const data = await res.json();
          return { folderId: folder.id, items: (data.items || []) as string[] };
        })
      );
      const map = new Map<string, Set<string>>();
      for (const { folderId, items } of results) {
        for (const collegeId of items) {
          if (!map.has(collegeId)) map.set(collegeId, new Set());
          map.get(collegeId)!.add(folderId);
        }
      }
      return map;
    },
    enabled: !!user && !!folders && folders.length > 0,
    staleTime: 30_000,
  });
}

export function useToggleFolderItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      folderId,
      collegeId,
      action,
    }: {
      folderId: string;
      collegeId: string;
      action: "add" | "remove";
    }) => {
      if (action === "add") {
        const res = await fetch(`/api/folders/${folderId}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ collegeId }),
        });
        if (!res.ok && res.status !== 409) throw new Error("Failed to add to folder");
      } else {
        const res = await fetch(
          `/api/folders/${folderId}/items?collegeId=${collegeId}`,
          { method: "DELETE" }
        );
        if (!res.ok) throw new Error("Failed to remove from folder");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folder-memberships"] });
    },
  });
}

export function useCreateFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name }: { name: string }) => {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create folder");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      queryClient.invalidateQueries({ queryKey: ["folder-memberships"] });
    },
  });
}
