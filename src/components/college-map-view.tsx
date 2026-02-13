"use client";

import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { College } from "@/lib/types";

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

interface CollegeMapViewProps {
  colleges: College[];
  isLoading: boolean;
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

export default function CollegeMapView({
  colleges,
  isLoading,
}: CollegeMapViewProps) {
  const mappableColleges = useMemo(
    () => colleges.filter((c) => c.latitude != null && c.longitude != null),
    [colleges]
  );

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
  );
}
