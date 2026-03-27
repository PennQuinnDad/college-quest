"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FaIcon } from "@/components/ui/fa-icon";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import type { CollegeNote, UserProfile } from "@/lib/types";

interface CollegeNotesProps {
  collegeId: string;
  user: UserProfile;
}

export function CollegeNotes({ collegeId, user }: CollegeNotesProps) {
  const queryClient = useQueryClient();
  const [newNote, setNewNote] = useState("");
  const [visibility, setVisibility] = useState<"family" | "private">("family");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editVisibility, setEditVisibility] = useState<"family" | "private">("family");

  const { data: notesData, isLoading } = useQuery<{ notes: CollegeNote[] }>({
    queryKey: ["college-notes", collegeId],
    queryFn: async () => {
      const res = await fetch(`/api/colleges/${collegeId}/notes`);
      if (!res.ok) return { notes: [] };
      return res.json();
    },
  });

  const createNote = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/colleges/${collegeId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newNote.trim(), visibility }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to add note");
      }
      return res.json();
    },
    onSuccess: () => {
      setNewNote("");
      queryClient.invalidateQueries({ queryKey: ["college-notes", collegeId] });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const updateNote = useMutation({
    mutationFn: async ({ noteId, content, noteVisibility }: { noteId: string; content: string; noteVisibility: string }) => {
      const res = await fetch(`/api/colleges/${collegeId}/notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteId, content, visibility: noteVisibility }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update note");
      }
      return res.json();
    },
    onSuccess: () => {
      setEditingId(null);
      setEditContent("");
      queryClient.invalidateQueries({ queryKey: ["college-notes", collegeId] });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const deleteNote = useMutation({
    mutationFn: async (noteId: string) => {
      const res = await fetch(
        `/api/colleges/${collegeId}/notes?noteId=${noteId}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error("Failed to delete note");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["college-notes", collegeId] });
    },
    onError: () => {
      toast({ title: "Failed to delete note", variant: "destructive" });
    },
  });

  const notes = notesData?.notes ?? [];

  function startEditing(note: CollegeNote) {
    setEditingId(note.id);
    setEditContent(note.content);
    setEditVisibility(note.visibility);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditContent("");
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FaIcon icon="comments" style="duotone" className="text-sm text-primary" />
          Notes
          {notes.length > 0 && (
            <Badge variant="secondary" className="ml-1 text-[10px]">
              {notes.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add note form */}
        <div className="space-y-2">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a note about this college..."
            className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
            maxLength={2000}
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setVisibility("family")}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors",
                  visibility === "family"
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-gray-100",
                )}
              >
                <FaIcon icon="users" style="duotone" className="text-[10px]" />
                Family
              </button>
              <button
                onClick={() => setVisibility("private")}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors",
                  visibility === "private"
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-gray-100",
                )}
              >
                <FaIcon icon="lock" style="duotone" className="text-[10px]" />
                Private
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">
                {newNote.length}/2000
              </span>
              <Button
                size="sm"
                onClick={() => createNote.mutate()}
                disabled={!newNote.trim() || createNote.isPending}
              >
                {createNote.isPending ? (
                  <FaIcon icon="spinner" style="duotone" className="mr-1.5 text-xs fa-spin" />
                ) : (
                  <FaIcon icon="plus" style="solid" className="mr-1.5 text-xs" />
                )}
                Add Note
              </Button>
            </div>
          </div>
        </div>

        {/* Notes list */}
        {isLoading ? (
          <div className="py-4 text-center text-muted-foreground">
            <FaIcon icon="spinner" style="duotone" className="fa-spin" />
          </div>
        ) : notes.length === 0 ? (
          <p className="py-2 text-center text-xs text-muted-foreground">
            No notes yet. Add one to share thoughts with your family.
          </p>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => {
              const isOwn = note.userId === user.id;
              const isEditing = editingId === note.id;

              return (
                <div
                  key={note.id}
                  className={cn(
                    "rounded-lg border p-3",
                    isOwn ? "border-primary/20 bg-primary/5" : "border-border bg-gray-50",
                  )}
                >
                  <div className="mb-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-foreground">
                        {isOwn ? "You" : note.userName || "Family member"}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[9px]",
                          note.visibility === "private"
                            ? "border-gray-300 text-gray-500"
                            : "border-blue-200 text-blue-600",
                        )}
                      >
                        <FaIcon
                          icon={note.visibility === "private" ? "lock" : "users"}
                          style="duotone"
                          className="mr-0.5 text-[8px]"
                        />
                        {isEditing ? editVisibility : note.visibility}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(note.createdAt).toLocaleDateString()}
                        {note.updatedAt !== note.createdAt && " (edited)"}
                      </span>
                      {isOwn && !isEditing && (
                        <>
                          <button
                            onClick={() => startEditing(note)}
                            className="rounded p-0.5 text-muted-foreground transition-colors hover:text-primary"
                            title="Edit note"
                          >
                            <FaIcon icon="pen" style="regular" className="text-[10px]" />
                          </button>
                          <button
                            onClick={() => deleteNote.mutate(note.id)}
                            className="rounded p-0.5 text-muted-foreground transition-colors hover:text-red-500"
                            title="Delete note"
                          >
                            <FaIcon icon="trash" style="regular" className="text-[10px]" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="space-y-2">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="flex min-h-[60px] w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                        maxLength={2000}
                      />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditVisibility("family")}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors",
                              editVisibility === "family"
                                ? "bg-primary/10 text-primary font-medium"
                                : "text-muted-foreground hover:bg-gray-100",
                            )}
                          >
                            <FaIcon icon="users" style="duotone" className="text-[10px]" />
                            Family
                          </button>
                          <button
                            onClick={() => setEditVisibility("private")}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors",
                              editVisibility === "private"
                                ? "bg-primary/10 text-primary font-medium"
                                : "text-muted-foreground hover:bg-gray-100",
                            )}
                          >
                            <FaIcon icon="lock" style="duotone" className="text-[10px]" />
                            Private
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground">
                            {editContent.length}/2000
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={cancelEditing}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() =>
                              updateNote.mutate({
                                noteId: note.id,
                                content: editContent,
                                noteVisibility: editVisibility,
                              })
                            }
                            disabled={!editContent.trim() || updateNote.isPending}
                          >
                            {updateNote.isPending ? (
                              <FaIcon icon="spinner" style="duotone" className="mr-1.5 text-xs fa-spin" />
                            ) : (
                              <FaIcon icon="check" style="solid" className="mr-1.5 text-xs" />
                            )}
                            Save
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="whitespace-pre-line break-words text-sm text-foreground">
                      {note.content}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
