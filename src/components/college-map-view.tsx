"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { CollegeCard } from "@/components/college-card";
import { FaIcon } from "@/components/ui/fa-icon";
import type { College, UserProfile } from "@/lib/types";

// Fix Leaflet default icon paths
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const ZOOM_THRESHOLD = 10;
const MAX_VIEWPORT_CARDS = 50;

interface CollegeMapViewProps {
  colleges: College[];
  isLoading: boolean;
  favoriteIds: Set<string>;
  onToggleFavorite: (collegeId: string) => void;
  user: UserProfile | null | undefined;
}

function FitBounds({ colleges }: { colleges: College[] }) {
  const map = useMap();

  useMemo(() => {
    const points = colleges
      .filter((c) => c.latitude != null && c.longitude != null)
      .map((c) => [c.latitude!, c.longitude!] as [number, number]);

    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
    }
  }, [colleges, map]);

  return null;
}

function MapViewportTracker({
  onViewportChange,
}: {
  onViewportChange: (zoom: number, bounds: L.LatLngBounds) => void;
}) {
  const map = useMapEvents({
    moveend: () => {
      onViewportChange(map.getZoom(), map.getBounds());
    },
    zoomend: () => {
      onViewportChange(map.getZoom(), map.getBounds());
    },
  });
  return null;
}

export default function CollegeMapView({
  colleges,
  isLoading,
  favoriteIds,
  onToggleFavorite,
  user,
}: CollegeMapViewProps) {
  const mappableColleges = useMemo(
    () => colleges.filter((c) => c.latitude != null && c.longitude != null),
    [colleges]
  );

  const [viewport, setViewport] = useState<{
    zoom: number;
    bounds: L.LatLngBounds;
  } | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleViewportChange = useCallback(
    (zoom: number, bounds: L.LatLngBounds) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setViewport({ zoom, bounds });
      }, 200);
    },
    []
  );

  const visibleColleges = useMemo(() => {
    if (!viewport || viewport.zoom < ZOOM_THRESHOLD) return [];
    return mappableColleges.filter((c) =>
      viewport.bounds.contains(L.latLng(c.latitude!, c.longitude!))
    );
  }, [viewport, mappableColleges]);

  if (isLoading) {
    return (
      <div className="flex h-[600px] items-center justify-center rounded-xl border border-border bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (mappableColleges.length === 0) {
    return (
      <div className="flex h-[600px] items-center justify-center rounded-xl border border-border bg-gray-50 text-muted-foreground">
        No colleges with map coordinates found for the current filters.
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-border shadow-sm">
        <MapContainer
          center={[39.8283, -98.5795]}
          zoom={4}
          scrollWheelZoom={true}
          className="h-[600px] w-full"
          style={{ zIndex: 0 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          <FitBounds colleges={mappableColleges} />
          <MapViewportTracker onViewportChange={handleViewportChange} />
          <MarkerClusterGroup chunkedLoading>
            {mappableColleges.map((college) => (
              <Marker
                key={college.id}
                position={[college.latitude!, college.longitude!]}
                icon={defaultIcon}
              >
                <Popup>
                  <div className="min-w-[180px]">
                    <a
                      href={`/college/${college.id}`}
                      className="font-semibold text-primary hover:underline"
                    >
                      {college.name}
                    </a>
                    <div className="mt-1 text-xs text-gray-600">
                      {college.city}, {college.state}
                    </div>
                    {college.acceptanceRate != null && (
                      <div className="mt-0.5 text-xs text-gray-500">
                        {college.acceptanceRate.toFixed(1)}% acceptance rate
                      </div>
                    )}
                    {college.type && (
                      <div className="mt-0.5 text-xs text-gray-500">
                        {college.type}
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MarkerClusterGroup>
        </MapContainer>
      </div>

      {visibleColleges.length > 0 && (
        <div className="mt-4">
          <div className="mb-3 flex items-center gap-2">
            <FaIcon
              icon="map-pin"
              style="duotone"
              className="text-sm text-primary"
            />
            <span className="text-sm font-medium text-foreground">
              {visibleColleges.length > MAX_VIEWPORT_CARDS
                ? `Showing ${MAX_VIEWPORT_CARDS} of ${visibleColleges.length} colleges in view`
                : `${visibleColleges.length} college${visibleColleges.length !== 1 ? "s" : ""} in view`}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleColleges.slice(0, MAX_VIEWPORT_CARDS).map((college) => (
              <CollegeCard
                key={college.id}
                college={college}
                isFavorite={favoriteIds.has(college.id)}
                onToggleFavorite={() => onToggleFavorite(college.id)}
                user={user}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
