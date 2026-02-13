"use client";

import { useState, useRef, useEffect } from "react";
import { FaIcon } from "@/components/ui/fa-icon";
import { cn } from "@/lib/utils";
import {
  useFolders,
  useFolderMemberships,
  useToggleFolderItem,
  useCreateFolder,
} from "@/hooks/use-folders";

interface CollegeActionsProps {
  collegeId: string;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  user: unknown;
  variant: "table" | "grid" | "list" | "detail";
}

export function CollegeActions({
  collegeId,
  isFavorite,
  onToggleFavorite,
  user,
  variant,
}: CollegeActionsProps) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: folders } = useFolders(user);
  const { data: memberships } = useFolderMemberships(user, folders);
  const toggleFolderItem = useToggleFolderItem();
  const createFolder = useCreateFolder();

  // Click-outside to close
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
        setNewFolderName("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setCreating(false);
        setNewFolderName("");
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // Focus input when "New Folder" mode activates
  useEffect(() => {
    if (creating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [creating]);

  if (!user) return null;

  const collegeFolders = memberships?.get(collegeId) ?? new Set<string>();

  function handleToggleFolder(folderId: string) {
    const isInFolder = collegeFolders.has(folderId);
    toggleFolderItem.mutate({
      folderId,
      collegeId,
      action: isInFolder ? "remove" : "add",
    });
  }

  async function handleCreateFolder() {
    const name = newFolderName.trim();
    if (!name) return;
    try {
      const folder = await createFolder.mutateAsync({ name });
      setNewFolderName("");
      setCreating(false);
      // Auto-add this college to the new folder
      if (folder?.id) {
        toggleFolderItem.mutate({ folderId: folder.id, collegeId, action: "add" });
      }
    } catch {
      // Error handled by React Query
    }
  }

  const dropdown = open && (
    <div className="absolute right-0 top-full z-50 mt-1 w-56 overflow-hidden rounded-lg border border-border bg-white shadow-lg">
      {/* Favorite toggle */}
      <button
        onClick={() => {
          onToggleFavorite();
          setOpen(false);
        }}
        className="flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-gray-50"
      >
        <FaIcon
          icon="heart"
          style={isFavorite ? "solid" : "regular"}
          className={cn("text-sm", isFavorite ? "text-red-500" : "text-muted-foreground")}
        />
        {isFavorite ? "Remove from favorites" : "Add to favorites"}
      </button>

      {/* Separator + folders section */}
      {(folders && folders.length > 0) && (
        <>
          <div className="border-t border-border" />
          <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Folders
          </div>
          <div className="max-h-40 overflow-y-auto">
            {folders.map((folder) => {
              const isInFolder = collegeFolders.has(folder.id);
              return (
                <button
                  key={folder.id}
                  onClick={() => handleToggleFolder(folder.id)}
                  className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm transition-colors hover:bg-gray-50"
                >
                  <FaIcon
                    icon={isInFolder ? "square-check" : "square"}
                    style={isInFolder ? "solid" : "regular"}
                    className={cn(
                      "text-sm",
                      isInFolder ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                  <span className="truncate">{folder.name}</span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Create folder */}
      <div className="border-t border-border">
        {creating ? (
          <div className="flex items-center gap-1 p-2">
            <input
              ref={inputRef}
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateFolder();
                if (e.key === "Escape") {
                  setCreating(false);
                  setNewFolderName("");
                }
              }}
              placeholder="Folder name..."
              className="h-7 flex-1 rounded border border-border bg-white px-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
              disabled={createFolder.isPending}
            />
            <button
              onClick={handleCreateFolder}
              disabled={!newFolderName.trim() || createFolder.isPending}
              className="rounded bg-primary px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {createFolder.isPending ? "..." : "Add"}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-gray-50"
          >
            <FaIcon icon="plus" className="text-sm text-muted-foreground" />
            New Folder...
          </button>
        )}
      </div>
    </div>
  );

  // ── Grid variant: absolute-positioned buttons ──
  if (variant === "grid") {
    return (
      <>
        <button
          onClick={onToggleFavorite}
          className="absolute top-2 right-2 rounded-full bg-white/90 p-1.5 shadow-sm transition-colors hover:bg-white"
        >
          <FaIcon
            icon="heart"
            style={isFavorite ? "solid" : "regular"}
            className={cn("text-sm", isFavorite ? "text-red-500" : "text-muted-foreground")}
          />
        </button>
        <div ref={dropdownRef} className="absolute top-2 right-10">
          <button
            onClick={() => setOpen(!open)}
            className="rounded-full bg-white/90 p-1.5 shadow-sm transition-colors hover:bg-white"
          >
            <FaIcon icon="ellipsis" style="solid" className="text-sm text-muted-foreground" />
          </button>
          {dropdown}
        </div>
      </>
    );
  }

  // ── Detail variant: only ellipsis + dropdown (heart handled by parent) ──
  if (variant === "detail") {
    return (
      <div ref={dropdownRef} className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="rounded-md p-1.5 transition-colors hover:bg-gray-100"
        >
          <FaIcon icon="ellipsis" style="solid" className="text-sm text-muted-foreground" />
        </button>
        {dropdown}
      </div>
    );
  }

  // ── Table / List variant: inline flex ──
  return (
    <div className="flex items-center gap-0.5">
      <button
        onClick={onToggleFavorite}
        className={cn(
          "rounded-md transition-colors hover:bg-red-50",
          variant === "list" ? "p-1.5" : "p-1"
        )}
        title={isFavorite ? "Remove from favorites" : "Add to favorites"}
      >
        <FaIcon
          icon="heart"
          style={isFavorite ? "solid" : "regular"}
          className={cn("text-sm", isFavorite ? "text-red-500" : "text-muted-foreground")}
        />
      </button>
      <div ref={dropdownRef} className="relative">
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            "rounded-md transition-colors hover:bg-gray-100",
            variant === "list" ? "p-1.5" : "p-1"
          )}
          title="Folder options"
        >
          <FaIcon icon="ellipsis" style="solid" className="text-sm text-muted-foreground" />
        </button>
        {dropdown}
      </div>
    </div>
  );
}
