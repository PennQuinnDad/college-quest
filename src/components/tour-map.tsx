"use client";

import { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  LayersControl,
  Marker,
  Tooltip,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { TourDayWithStops } from "@/lib/types";

// Day colors for markers and route lines
const DAY_COLORS = [
  "#6366f1", // indigo
  "#ef4444", // red
  "#22c55e", // green
  "#f59e0b", // amber
  "#3b82f6", // blue
  "#a855f7", // purple
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f97316", // orange
  "#84cc16", // lime
  "#06b6d4", // cyan
  "#e11d48", // rose
];

function createNumberedIcon(number: number, color: string) {
  return L.divIcon({
    html: `<div style="
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: ${color};
      border: 2px solid white;
      border-radius: 50%;
      font-size: 12px;
      font-weight: 700;
      color: white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    ">${number}</div>`,
    className: "",
    iconSize: L.point(28, 28),
    iconAnchor: L.point(14, 14),
  });
}

function FitBounds({ days }: { days: TourDayWithStops[] }) {
  const map = useMap();

  useEffect(() => {
    const points: [number, number][] = [];
    for (const day of days) {
      for (const stop of day.stops) {
        if (stop.college?.latitude != null && stop.college?.longitude != null) {
          points.push([stop.college.latitude, stop.college.longitude]);
        }
      }
    }

    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
    }
  }, [days, map]);

  return null;
}

interface TourMapProps {
  days: TourDayWithStops[];
}

export default function TourMap({ days }: TourMapProps) {
  // Collect all markers and route lines
  const { markers, polylines } = useMemo(() => {
    const markers: {
      key: string;
      position: [number, number];
      number: number;
      color: string;
      name: string;
      dayTitle: string | null;
    }[] = [];
    const polylines: { key: string; positions: [number, number][]; color: string }[] = [];

    let stopNumber = 1;
    for (let dayIndex = 0; dayIndex < days.length; dayIndex++) {
      const day = days[dayIndex];
      const color = DAY_COLORS[dayIndex % DAY_COLORS.length];
      const dayPositions: [number, number][] = [];

      for (const stop of day.stops) {
        if (stop.college?.latitude != null && stop.college?.longitude != null) {
          const pos: [number, number] = [stop.college.latitude, stop.college.longitude];
          markers.push({
            key: stop.id,
            position: pos,
            number: stopNumber,
            color,
            name: stop.college.name,
            dayTitle: day.title,
          });
          dayPositions.push(pos);
          stopNumber++;
        }
      }

      if (dayPositions.length >= 2) {
        polylines.push({
          key: `day-${day.id}`,
          positions: dayPositions,
          color,
        });
      }
    }

    return { markers, polylines };
  }, [days]);

  if (markers.length === 0) return null;

  return (
    <MapContainer
      center={[39.8283, -98.5795]}
      zoom={4}
      style={{ height: "400px", width: "100%" }}
      scrollWheelZoom={true}
    >
      <LayersControl position="topleft">
        <LayersControl.BaseLayer checked name="Street">
          <TileLayer
            attribution='&copy; <a href="https://carto.com">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Satellite">
          <TileLayer
            attribution='&copy; <a href="https://www.esri.com">Esri</a>'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Terrain">
          <TileLayer
            attribution='&copy; <a href="https://opentopomap.org">OpenTopoMap</a>'
            url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
          />
        </LayersControl.BaseLayer>
      </LayersControl>

      <FitBounds days={days} />

      {/* Route polylines */}
      {polylines.map((pl) => (
        <Polyline
          key={pl.key}
          positions={pl.positions}
          pathOptions={{
            color: pl.color,
            weight: 3,
            opacity: 0.7,
            dashArray: "8, 6",
          }}
        />
      ))}

      {/* Numbered markers */}
      {markers.map((m) => (
        <Marker
          key={m.key}
          position={m.position}
          icon={createNumberedIcon(m.number, m.color)}
        >
          <Tooltip direction="top" offset={[0, -16]}>
            <span className="text-xs font-medium">{m.name}</span>
            {m.dayTitle && (
              <span className="text-xs text-gray-500 block">{m.dayTitle}</span>
            )}
          </Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
}
