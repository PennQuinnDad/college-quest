"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-user";
import { useTours, useCreateTour, useDeleteTour } from "@/hooks/use-tours";
import { FaIcon } from "@/components/ui/fa-icon";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { LocationPicker } from "@/components/location-picker";
import { cn } from "@/lib/utils";
import type { College, TourSummary } from "@/lib/types";

export default function ToursPageWrapper() {
  return (
    <Suspense>
      <ToursPage />
    </Suspense>
  );
}

function ToursPage() {
  const { data: user, isLoading: userLoading } = useUser();
  const { data: tours, isLoading: toursLoading } = useTours(user);
  const createTour = useCreateTour();
  const deleteTour = useDeleteTour();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Auto-open create dialog from query params (e.g., from main page "Create Tour" button)
  const autoCreate = searchParams.get("create") === "true";
  const sourceType = searchParams.get("source"); // "folder" or "favorites"
  const sourceFolderId = searchParams.get("folderId");

  const [showCreate, setShowCreate] = useState(false);
  const [tourName, setTourName] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<TourSummary | null>(null);
  const [autoCreateHandled, setAutoCreateHandled] = useState(false);
  const [startLocation, setStartLocation] = useState<string | null>(null);
  const [startLat, setStartLat] = useState<number | null>(null);
  const [startLng, setStartLng] = useState<number | null>(null);
  const [endLocation, setEndLocation] = useState<string | null>(null);
  const [endLat, setEndLat] = useState<number | null>(null);
  const [endLng, setEndLng] = useState<number | null>(null);

  // Fetch folder items if creating from a folder
  const { data: folderItemIds } = useQuery<string[]>({
    queryKey: ["folder-items", sourceFolderId],
    queryFn: async () => {
      const res = await fetch(`/api/folders/${sourceFolderId}/items`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.items || [];
    },
    enabled: !!sourceFolderId && autoCreate,
  });

  // Fetch user's favorites
  const { data: favoritesData } = useQuery<{ favorites: string[] }>({
    queryKey: ["favorites"],
    queryFn: async () => {
      const res = await fetch("/api/favorites");
      if (!res.ok) return { favorites: [] };
      return res.json();
    },
    enabled: !!user && (showCreate || autoCreate),
  });

  const favoriteIds = favoritesData?.favorites ?? [];

  // Determine which college IDs to use for the dialog
  const sourceCollegeIds = useMemo(() => {
    if (sourceType === "folder" && folderItemIds) return folderItemIds;
    return favoriteIds;
  }, [sourceType, folderItemIds, favoriteIds]);

  // Fetch college details for the relevant IDs (only when dialog is open)
  const { data: collegesData } = useQuery<{ colleges: College[] }>({
    queryKey: ["tour-colleges", sourceCollegeIds],
    queryFn: async () => {
      if (sourceCollegeIds.length === 0) return { colleges: [] };
      const qs = new URLSearchParams();
      qs.set("favoriteIds", sourceCollegeIds.join(","));
      qs.set("limit", String(sourceCollegeIds.length));
      const res = await fetch(`/api/colleges?${qs.toString()}`);
      if (!res.ok) return { colleges: [] };
      return res.json();
    },
    enabled: sourceCollegeIds.length > 0 && (showCreate || autoCreate),
  });

  const allColleges = useMemo(
    () => (collegesData?.colleges ?? []).sort((a, b) => a.name.localeCompare(b.name)),
    [collegesData?.colleges],
  );

  // Auto-open create dialog and pre-select colleges when navigated from main page
  useEffect(() => {
    if (autoCreate && !autoCreateHandled && allColleges.length > 0) {
      setShowCreate(true);
      setSelectedIds(new Set(allColleges.map((c) => c.id)));
      setAutoCreateHandled(true);
    }
  }, [autoCreate, autoCreateHandled, allColleges]);

  function toggleCollege(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    if (selectedIds.size === allColleges.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allColleges.map((c) => c.id)));
    }
  }

  async function handleCreate() {
    if (!tourName.trim() || selectedIds.size === 0) return;
    try {
      const result = await createTour.mutateAsync({
        name: tourName.trim(),
        collegeIds: [...selectedIds],
        startLocation,
        startLatitude: startLat,
        startLongitude: startLng,
        endLocation,
        endLatitude: endLat,
        endLongitude: endLng,
      });
      setShowCreate(false);
      setTourName("");
      setSelectedIds(new Set());
      setStartLocation(null);
      setStartLat(null);
      setStartLng(null);
      setEndLocation(null);
      setEndLat(null);
      setEndLng(null);
      router.push(`/tours/${result.id}`);
    } catch {
      // Error handled by mutation
    }
  }

  async function handleDelete() {
    if (!deleteConfirm) return;
    try {
      await deleteTour.mutateAsync(deleteConfirm.id);
      setDeleteConfirm(null);
    } catch {
      // Error handled by mutation
    }
  }

  if (userLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <FaIcon icon="spinner" style="duotone" className="text-2xl fa-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Please log in to plan campus tours.</p>
            <Link href="/login">
              <Button className="mt-4">Log in</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-muted-foreground hover:text-foreground">
              <FaIcon icon="arrow-left" style="solid" className="text-sm" />
            </Link>
            <h1 className="text-lg font-semibold">Campus Tours</h1>
          </div>
          <Button onClick={() => setShowCreate(true)} size="sm">
            <FaIcon icon="plus" style="solid" className="mr-1.5 text-xs" />
            New Tour
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {toursLoading ? (
          <div className="py-20 text-center text-muted-foreground">
            <FaIcon icon="spinner" style="duotone" className="fa-spin mr-2 text-xl" />
            <p className="mt-2 text-sm">Loading tours...</p>
          </div>
        ) : !tours || tours.length === 0 ? (
          <div className="py-20 text-center">
            <FaIcon icon="route" style="duotone" className="mb-4 text-4xl text-gray-300" />
            <h2 className="text-lg font-semibold">No Campus Tours Yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Create a tour to plan day-by-day college visit itineraries from your favorites.
            </p>
            <Button className="mt-6" onClick={() => setShowCreate(true)}>
              <FaIcon icon="plus" style="solid" className="mr-2 text-xs" />
              Create Your First Tour
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tours.map((tour) => (
              <Link key={tour.id} href={`/tours/${tour.id}`}>
                <Card className="group h-full transition-shadow hover:shadow-md cursor-pointer">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-sm group-hover:text-primary transition-colors truncate">
                          {tour.name}
                        </h3>
                        {tour.startDate && tour.endDate && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {new Date(tour.startDate + "T00:00:00").toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                            {" — "}
                            {new Date(tour.endDate + "T00:00:00").toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDeleteConfirm(tour);
                        }}
                        className="ml-2 rounded p-1 text-gray-400 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all"
                      >
                        <FaIcon icon="trash" style="solid" className="text-xs" />
                      </button>
                    </div>
                    <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <FaIcon icon="calendar-days" style="duotone" className="text-xs" />
                        {tour.dayCount} {tour.dayCount === 1 ? "Day" : "Days"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <FaIcon icon="building-columns" style="duotone" className="text-xs" />
                        {tour.stopCount} {tour.stopCount === 1 ? "School" : "Schools"}
                      </span>
                    </div>
                    {tour.states.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {tour.states.map((state) => (
                          <span
                            key={state}
                            className="inline-block rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600"
                          >
                            {state}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mt-3 pt-2 border-t border-border/50 flex justify-end gap-3 text-[10px] text-gray-400">
                      <span>
                        Created{" "}
                        {new Date(tour.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      {tour.updatedAt !== tour.createdAt && (
                        <span>
                          Modified{" "}
                          {new Date(tour.updatedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Create Tour Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Campus Tour</DialogTitle>
            <DialogDescription>
              Name your tour and select colleges from your favorites.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Tour Name</label>
              <Input
                value={tourName}
                onChange={(e) => setTourName(e.target.value)}
                placeholder="e.g. California College Road Trip"
                className="mt-1"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">
                  Select Colleges ({selectedIds.size} selected)
                </label>
                {allColleges.length > 0 && (
                  <button
                    onClick={selectAll}
                    className="text-xs text-primary hover:underline"
                  >
                    {selectedIds.size === allColleges.length ? "Deselect All" : "Select All"}
                  </button>
                )}
              </div>

              {allColleges.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No favorites yet. Favorite some colleges first!
                </p>
              ) : (
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto border rounded-md p-3">
                  {allColleges.map((c) => {
                    const isSelected = selectedIds.has(c.id);
                    return (
                      <button
                        key={c.id}
                        onClick={() => toggleCollege(c.id)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
                          isSelected
                            ? "border-primary bg-primary/10 text-primary font-medium"
                            : "border-border text-muted-foreground hover:border-gray-400",
                        )}
                      >
                        {isSelected && <FaIcon icon="check" className="text-[10px]" />}
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="text-sm font-medium">Locations</label>
                <span className="text-xs text-muted-foreground">(optional — can set per day later)</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FaIcon icon="location-dot" style="solid" className="text-sm text-blue-500 shrink-0" />
                  <span className="text-xs text-muted-foreground shrink-0 w-14">Start</span>
                  <LocationPicker
                    value={startLocation}
                    latitude={startLat}
                    longitude={startLng}
                    onChange={(loc, lat, lng) => {
                      setStartLocation(loc);
                      setStartLat(lat);
                      setStartLng(lng);
                    }}
                    placeholder="Hotel, airport, home address..."
                  />
                </div>
                <div className="flex items-center gap-2">
                  <FaIcon icon="flag-checkered" style="solid" className="text-sm text-orange-500 shrink-0" />
                  <span className="text-xs text-muted-foreground shrink-0 w-14">End</span>
                  <LocationPicker
                    value={endLocation}
                    latitude={endLat}
                    longitude={endLng}
                    onChange={(loc, lat, lng) => {
                      setEndLocation(loc);
                      setEndLat(lat);
                      setEndLng(lng);
                    }}
                    placeholder="Hotel, airport, home address..."
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreate(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!tourName.trim() || selectedIds.size === 0 || createTour.isPending}
            >
              {createTour.isPending ? (
                <>
                  <FaIcon icon="spinner" style="duotone" className="fa-spin mr-1.5 text-xs" />
                  Creating...
                </>
              ) : (
                <>
                  <FaIcon icon="route" style="duotone" className="mr-1.5 text-xs" />
                  Create Tour
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Tour</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deleteConfirm?.name}&rdquo;? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteTour.isPending}
            >
              {deleteTour.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
