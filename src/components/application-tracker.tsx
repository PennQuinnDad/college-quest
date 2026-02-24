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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import type { ApplicationStatus, ApplicationType, CollegeApplication } from "@/lib/types";

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; icon: string; color: string }> = {
  researching: { label: "Researching", icon: "magnifying-glass", color: "text-gray-500 bg-gray-100 border-gray-200" },
  applying: { label: "Applying", icon: "pen-to-square", color: "text-blue-600 bg-blue-50 border-blue-200" },
  applied: { label: "Applied", icon: "paper-plane", color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
  accepted: { label: "Accepted", icon: "circle-check", color: "text-green-600 bg-green-50 border-green-200" },
  rejected: { label: "Rejected", icon: "circle-xmark", color: "text-red-600 bg-red-50 border-red-200" },
  waitlisted: { label: "Waitlisted", icon: "clock", color: "text-amber-600 bg-amber-50 border-amber-200" },
  deferred: { label: "Deferred", icon: "hourglass-half", color: "text-orange-600 bg-orange-50 border-orange-200" },
  enrolled: { label: "Enrolled", icon: "graduation-cap", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  withdrawn: { label: "Withdrawn", icon: "arrow-right-from-bracket", color: "text-gray-400 bg-gray-50 border-gray-200" },
};

const APP_TYPE_LABELS: Record<ApplicationType, string> = {
  early_decision: "Early Decision",
  early_action: "Early Action",
  regular: "Regular Decision",
  rolling: "Rolling",
};

interface ApplicationTrackerProps {
  collegeId: string;
  collegeName: string;
  isStudent: boolean;
}

export function ApplicationTracker({ collegeId, collegeName, isStudent }: ApplicationTrackerProps) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState("");
  const [deadline, setDeadline] = useState("");
  const [appType, setAppType] = useState<ApplicationType | "">("");
  const [shared, setShared] = useState(true);

  const { data: appData, isLoading } = useQuery<{ applications: CollegeApplication[] }>({
    queryKey: ["applications"],
    queryFn: async () => {
      const res = await fetch("/api/applications");
      if (!res.ok) return { applications: [] };
      return res.json();
    },
  });

  const app = appData?.applications?.find((a) => a.collegeId === collegeId);

  const saveMutation = useMutation({
    mutationFn: async (status: ApplicationStatus) => {
      const body: Record<string, unknown> = {
        collegeId,
        status,
      };
      if (appType) body.applicationType = appType;
      if (deadline) body.deadline = deadline;
      if (notes.trim()) body.notes = notes.trim();
      body.sharedWithFamily = shared;

      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      setEditing(false);
      toast({ title: "Application updated" });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async () => {
      if (!app) return;
      const res = await fetch(`/api/applications?id=${app.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      setEditing(false);
      toast({ title: "Application removed" });
    },
  });

  // Load existing data when entering edit mode
  function startEdit() {
    if (app) {
      setNotes(app.notes || "");
      setDeadline(app.deadline || "");
      setAppType((app.applicationType as ApplicationType) || "");
      setShared(app.sharedWithFamily);
    } else {
      setNotes("");
      setDeadline("");
      setAppType("");
      setShared(true);
    }
    setEditing(true);
  }

  if (!isStudent) return null;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6 text-center">
          <FaIcon icon="spinner" style="duotone" className="fa-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const currentStatus = app?.status || null;
  const statusConfig = currentStatus ? STATUS_CONFIG[currentStatus] : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <FaIcon icon="clipboard-list" style="duotone" className="text-sm text-primary" />
            Application
          </span>
          {!editing && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={startEdit}
            >
              <FaIcon icon={app ? "pen" : "plus"} className="text-[10px]" />
              {app ? "Edit" : "Track"}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-3">
            {/* Status selection */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(Object.entries(STATUS_CONFIG) as [ApplicationStatus, typeof STATUS_CONFIG[ApplicationStatus]][]).map(
                  ([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => saveMutation.mutate(key)}
                      disabled={saveMutation.isPending}
                      className={cn(
                        "flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs transition-colors",
                        currentStatus === key
                          ? cfg.color + " font-medium"
                          : "border-border text-muted-foreground hover:border-gray-400 hover:text-foreground",
                      )}
                    >
                      <FaIcon icon={cfg.icon} style="duotone" className="text-[10px]" />
                      {cfg.label}
                    </button>
                  ),
                )}
              </div>
            </div>

            {/* Application type */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Type</label>
              <Select
                value={appType || "none"}
                onValueChange={(v) => setAppType(v === "none" ? "" : v as ApplicationType)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not specified</SelectItem>
                  {(Object.entries(APP_TYPE_LABELS) as [ApplicationType, string][]).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Deadline */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Deadline</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="flex h-8 w-full rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Notes <span className="font-normal text-muted-foreground">({notes.length}/1000)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Application notes..."
                maxLength={1000}
                className="flex min-h-[50px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>

            {/* Family sharing */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={shared}
                onChange={(e) => setShared(e.target.checked)}
                className="rounded"
              />
              <span className="text-xs text-muted-foreground">
                Share with family
              </span>
            </label>

            <div className="flex items-center justify-between pt-1">
              {app && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-red-500 hover:text-red-700"
                  onClick={() => removeMutation.mutate()}
                  disabled={removeMutation.isPending}
                >
                  Remove
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs ml-auto"
                onClick={() => setEditing(false)}
              >
                Done
              </Button>
            </div>
          </div>
        ) : app ? (
          <div className="space-y-2">
            {/* Current status badge */}
            <div className="flex items-center gap-2">
              {statusConfig && (
                <Badge className={cn("gap-1", statusConfig.color)}>
                  <FaIcon icon={statusConfig.icon} style="duotone" className="text-[10px]" />
                  {statusConfig.label}
                </Badge>
              )}
              {app.applicationType && (
                <Badge variant="outline" className="text-[10px]">
                  {APP_TYPE_LABELS[app.applicationType] || app.applicationType}
                </Badge>
              )}
            </div>

            {/* Details */}
            <div className="space-y-1 text-xs text-muted-foreground">
              {app.deadline && (
                <p className="flex items-center gap-1.5">
                  <FaIcon icon="calendar" style="duotone" className="text-[10px]" />
                  Deadline: {new Date(app.deadline).toLocaleDateString()}
                </p>
              )}
              {app.submittedAt && (
                <p className="flex items-center gap-1.5">
                  <FaIcon icon="paper-plane" style="duotone" className="text-[10px]" />
                  Submitted: {new Date(app.submittedAt).toLocaleDateString()}
                </p>
              )}
              {app.decisionAt && (
                <p className="flex items-center gap-1.5">
                  <FaIcon icon="envelope-open-text" style="duotone" className="text-[10px]" />
                  Decision: {new Date(app.decisionAt).toLocaleDateString()}
                </p>
              )}
              {app.notes && (
                <p className="mt-1 text-foreground/70 italic line-clamp-2">
                  {app.notes}
                </p>
              )}
              {!app.sharedWithFamily && (
                <p className="flex items-center gap-1 text-[10px]">
                  <FaIcon icon="lock" style="duotone" className="text-[8px]" />
                  Private (not shared with family)
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-center text-xs text-muted-foreground py-1">
            Not tracking this college yet.{" "}
            <button
              onClick={startEdit}
              className="text-primary hover:underline font-medium"
            >
              Start tracking
            </button>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
