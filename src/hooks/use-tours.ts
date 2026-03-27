"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { TourSummary, TourWithDays } from "@/lib/types";

export function useTours(user: unknown) {
  return useQuery<TourSummary[]>({
    queryKey: ["tours"],
    queryFn: async () => {
      const res = await fetch("/api/tours");
      if (!res.ok) return [];
      const data = await res.json();
      return data.tours || [];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

export function useTour(tourId: string, user: unknown) {
  return useQuery<TourWithDays>({
    queryKey: ["tour", tourId],
    queryFn: async () => {
      const res = await fetch(`/api/tours/${tourId}`);
      if (!res.ok) throw new Error("Failed to fetch tour");
      return res.json();
    },
    enabled: !!user && !!tourId,
    staleTime: 30_000,
  });
}

export function useCreateTour() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      collegeIds,
      startLocation,
      startLatitude,
      startLongitude,
      endLocation,
      endLatitude,
      endLongitude,
    }: {
      name: string;
      collegeIds: string[];
      startLocation?: string | null;
      startLatitude?: number | null;
      startLongitude?: number | null;
      endLocation?: string | null;
      endLatitude?: number | null;
      endLongitude?: number | null;
    }) => {
      const res = await fetch("/api/tours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          collegeIds,
          startLocation,
          startLatitude,
          startLongitude,
          endLocation,
          endLatitude,
          endLongitude,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create tour");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tours"] });
    },
  });
}

export function useUpdateTour() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      tourId,
      ...updates
    }: {
      tourId: string;
      name?: string;
      startDate?: string | null;
      endDate?: string | null;
      notes?: string | null;
      travelNotes?: string | null;
      sharedWithFamily?: boolean;
    }) => {
      const res = await fetch(`/api/tours/${tourId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update tour");
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tour", variables.tourId] });
      queryClient.invalidateQueries({ queryKey: ["tours"] });
    },
  });
}

export function useDeleteTour() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tourId: string) => {
      const res = await fetch(`/api/tours/${tourId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete tour");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tours"] });
    },
  });
}

export function useUpdateDay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      tourId,
      dayId,
      ...updates
    }: {
      tourId: string;
      dayId: string;
      title?: string | null;
      date?: string | null;
      notes?: string | null;
      startLocation?: string | null;
      startTravelMin?: number | null;
      endLocation?: string | null;
      endTravelMin?: number | null;
      departureTime?: number | null;
      startLatitude?: number | null;
      startLongitude?: number | null;
      endLatitude?: number | null;
      endLongitude?: number | null;
    }) => {
      const res = await fetch(`/api/tours/${tourId}/days/${dayId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update day");
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tour", variables.tourId] });
    },
  });
}

export function useAddDay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      tourId,
      title,
    }: {
      tourId: string;
      title?: string;
    }) => {
      const res = await fetch(`/api/tours/${tourId}/days`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error("Failed to add day");
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tour", variables.tourId] });
    },
  });
}

export function useDeleteDay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ tourId, dayId }: { tourId: string; dayId: string }) => {
      const res = await fetch(`/api/tours/${tourId}/days/${dayId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete day");
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tour", variables.tourId] });
    },
  });
}

export function useReorderDays() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      tourId,
      days,
    }: {
      tourId: string;
      days: { id: string; position: number }[];
    }) => {
      const res = await fetch(`/api/tours/${tourId}/days`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days }),
      });
      if (!res.ok) throw new Error("Failed to reorder days");
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tour", variables.tourId] });
    },
  });
}

export function useAddStop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      tourId,
      dayId,
      collegeId,
    }: {
      tourId: string;
      dayId: string;
      collegeId: string;
    }) => {
      const res = await fetch(`/api/tours/${tourId}/stops`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dayId, collegeId }),
      });
      if (!res.ok) throw new Error("Failed to add stop");
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tour", variables.tourId] });
    },
  });
}

export function useUpdateStops() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      tourId,
      stops,
    }: {
      tourId: string;
      stops: {
        id: string;
        position: number;
        tourDayId?: string;
        visitTime?: string | null;
        notes?: string | null;
      }[];
    }) => {
      const res = await fetch(`/api/tours/${tourId}/stops`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stops }),
      });
      if (!res.ok) throw new Error("Failed to update stops");
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tour", variables.tourId] });
    },
  });
}

export function useRemoveStop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ tourId, stopId }: { tourId: string; stopId: string }) => {
      const res = await fetch(`/api/tours/${tourId}/stops?stopId=${stopId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove stop");
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tour", variables.tourId] });
    },
  });
}
