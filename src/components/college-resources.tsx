"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { safeHref } from "@/lib/utils";
import { FaIcon } from "@/components/ui/fa-icon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";
import type { CollegeResource } from "@/lib/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RESOURCE_CATEGORIES = [
  "Academic Calendar",
  "Financial Aid",
  "Admissions",
  "Campus Life",
  "Housing",
  "Application",
  "Scholarships",
  "Other",
];

const CATEGORY_COLORS: Record<string, string> = {
  "Academic Calendar": "bg-blue-100 text-blue-700 border-blue-200",
  "Financial Aid": "bg-green-100 text-green-700 border-green-200",
  "Admissions": "bg-purple-100 text-purple-700 border-purple-200",
  "Campus Life": "bg-orange-100 text-orange-700 border-orange-200",
  "Housing": "bg-cyan-100 text-cyan-700 border-cyan-200",
  "Application": "bg-red-100 text-red-700 border-red-200",
  "Scholarships": "bg-yellow-100 text-yellow-700 border-yellow-200",
  "Other": "bg-gray-100 text-gray-700 border-gray-200",
};

interface ResourceFormData {
  title: string;
  url: string;
  description: string;
  category: string;
}

const EMPTY_FORM: ResourceFormData = {
  title: "",
  url: "",
  description: "",
  category: "",
};

// ---------------------------------------------------------------------------
// Map snake_case API response to camelCase
// ---------------------------------------------------------------------------

function mapResource(raw: Record<string, unknown>): CollegeResource {
  return {
    id: raw.id as string,
    collegeId: raw.college_id as string,
    type: raw.type as "link" | "file",
    title: raw.title as string,
    description: (raw.description ?? null) as string | null,
    category: (raw.category ?? null) as string | null,
    url: (raw.url ?? null) as string | null,
    storagePath: (raw.storage_path ?? null) as string | null,
    fileName: (raw.file_name ?? null) as string | null,
    fileSize: (raw.file_size ?? null) as number | null,
    mimeType: (raw.mime_type ?? null) as string | null,
    position: (raw.position as number) || 0,
    createdAt: raw.created_at as string,
    updatedAt: raw.updated_at as string,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CollegeResources({
  collegeId,
  isAdmin,
}: {
  collegeId: string;
  isAdmin: boolean;
}) {
  const queryClient = useQueryClient();

  // ---- State ----
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ResourceFormData>(EMPTY_FORM);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // ---- Data fetching ----
  const { data: resources = [], isLoading } = useQuery<CollegeResource[]>({
    queryKey: ["resources", collegeId],
    queryFn: async () => {
      const res = await fetch(`/api/colleges/${collegeId}/resources`);
      if (!res.ok) return [];
      const raw: Record<string, unknown>[] = await res.json();
      return raw.map(mapResource);
    },
  });

  // ---- Mutations ----
  const createMutation = useMutation({
    mutationFn: async (data: ResourceFormData) => {
      const res = await fetch(`/api/colleges/${collegeId}/resources`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create resource");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resources", collegeId] });
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      toast({ title: "Resource added" });
    },
    onError: () => {
      toast({ title: "Error adding resource", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ResourceFormData }) => {
      const res = await fetch(`/api/colleges/${collegeId}/resources/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update resource");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resources", collegeId] });
      setDialogOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      toast({ title: "Resource updated" });
    },
    onError: () => {
      toast({ title: "Error updating resource", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (resourceId: string) => {
      const res = await fetch(`/api/colleges/${collegeId}/resources/${resourceId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete resource");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resources", collegeId] });
      setDeleteConfirmId(null);
      toast({ title: "Resource deleted" });
    },
    onError: () => {
      toast({ title: "Error deleting resource", variant: "destructive" });
    },
  });

  // ---- Handlers ----
  function openAddDialog() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEditDialog(resource: CollegeResource) {
    setEditingId(resource.id);
    setForm({
      title: resource.title,
      url: resource.url || "",
      description: resource.description || "",
      category: resource.category || "",
    });
    setDialogOpen(true);
  }

  function handleSave() {
    if (!form.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    if (!form.url.trim()) {
      toast({ title: "URL is required", variant: "destructive" });
      return;
    }
    try {
      new URL(form.url.trim());
    } catch {
      toast({ title: "Please enter a valid URL (e.g. https://...)", variant: "destructive" });
      return;
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: form });
    } else {
      createMutation.mutate(form);
    }
  }

  function updateForm(key: keyof ResourceFormData, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // ---- Render ----
  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <FaIcon icon="paperclip" style="duotone" className="text-sm text-primary" />
              Resources
            </CardTitle>
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={openAddDialog} className="h-7 gap-1 text-xs">
                <FaIcon icon="plus" style="solid" className="text-[10px]" />
                Add Link
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <FaIcon icon="spinner" style="duotone" className="text-lg fa-spin text-muted-foreground" />
            </div>
          ) : resources.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              No resources yet.{isAdmin && " Click \"Add Link\" to get started."}
            </p>
          ) : (
            <div className="space-y-2">
              {resources.map((resource) => (
                <div
                  key={resource.id}
                  className="group flex items-start gap-2.5 rounded-md border border-border p-2.5 transition-colors hover:bg-gray-50"
                >
                  <FaIcon
                    icon="link"
                    style="duotone"
                    className="mt-0.5 shrink-0 text-sm text-muted-foreground"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <a
                        href={safeHref(resource.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
                      >
                        {resource.title}
                      </a>
                      {resource.category && (
                        <Badge
                          variant="outline"
                          className={`shrink-0 text-[10px] ${CATEGORY_COLORS[resource.category] || CATEGORY_COLORS.Other}`}
                        >
                          {resource.category}
                        </Badge>
                      )}
                    </div>
                    {resource.description && (
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                        {resource.description}
                      </p>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => openEditDialog(resource)}
                        title="Edit resource"
                      >
                        <FaIcon icon="pen" style="duotone" className="text-[10px] text-muted-foreground" />
                      </Button>
                      {deleteConfirmId === resource.id ? (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => deleteMutation.mutate(resource.id)}
                            disabled={deleteMutation.isPending}
                            title="Confirm delete"
                          >
                            <FaIcon
                              icon={deleteMutation.isPending ? "spinner" : "check"}
                              style="solid"
                              className={`text-[10px] ${deleteMutation.isPending ? "fa-spin" : ""}`}
                            />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => setDeleteConfirmId(null)}
                            title="Cancel delete"
                          >
                            <FaIcon icon="xmark" style="solid" className="text-[10px] text-muted-foreground" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setDeleteConfirmId(resource.id)}
                          title="Delete resource"
                        >
                          <FaIcon icon="trash" style="duotone" className="text-[10px] text-red-400" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Link" : "Add Link"}</DialogTitle>
            <DialogDescription>
              {editingId
                ? "Update the resource link below."
                : "Add a reference link for this college."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="r-title">Title *</Label>
              <Input
                id="r-title"
                value={form.title}
                onChange={(e) => updateForm("title", e.target.value)}
                placeholder="e.g. Academic Calendar 2025-26"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="r-url">URL *</Label>
              <Input
                id="r-url"
                value={form.url}
                onChange={(e) => updateForm("url", e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="r-desc">Description</Label>
              <Input
                id="r-desc"
                value={form.description}
                onChange={(e) => updateForm("description", e.target.value)}
                placeholder="Optional short description"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={form.category || undefined}
                onValueChange={(v) => updateForm("category", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {RESOURCE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-primary" onClick={handleSave} disabled={isSaving}>
              {isSaving && (
                <FaIcon icon="spinner" style="solid" className="mr-2 text-sm fa-spin" />
              )}
              {editingId ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
