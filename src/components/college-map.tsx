"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default icon paths (broken by webpack/bundlers)
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

/** Tells Leaflet to recalculate its container size after a layout change. */
function InvalidateSize({ trigger }: { trigger: boolean }) {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 150);
    return () => clearTimeout(t);
  }, [trigger, map]);
  return null;
}

// Shared expand / collapse SVG icons
const ExpandIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-gray-700">
    <polyline points="15 3 21 3 21 9" />
    <polyline points="9 21 3 21 3 15" />
    <line x1="21" y1="3" x2="14" y2="10" />
    <line x1="3" y1="21" x2="10" y2="14" />
  </svg>
);

const CollapseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-gray-700">
    <polyline points="4 14 10 14 10 20" />
    <polyline points="20 10 14 10 14 4" />
    <line x1="14" y1="10" x2="21" y2="3" />
    <line x1="3" y1="21" x2="10" y2="14" />
  </svg>
);

const ToggleButton = ({ fullscreen, onClick }: { fullscreen: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="absolute top-2 right-2 z-[10000] flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 bg-white shadow-md hover:bg-gray-50 transition-colors"
    title={fullscreen ? "Exit fullscreen (Esc)" : "Fullscreen"}
    aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
  >
    {fullscreen ? <CollapseIcon /> : <ExpandIcon />}
  </button>
);

interface CollegeMapProps {
  latitude: number;
  longitude: number;
  name: string;
  /** CSS aspect-ratio value, e.g. "21/5". Falls back to fixed 280px height. */
  aspectRatio?: string;
}

export default function CollegeMap({ latitude, longitude, name, aspectRatio }: CollegeMapProps) {
  const [fullscreen, setFullscreen] = useState(false);

  const toggleFullscreen = useCallback(() => setFullscreen((f) => !f), []);

  // Close on Escape key
  useEffect(() => {
    if (!fullscreen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [fullscreen]);

  // Lock body scroll when fullscreen
  useEffect(() => {
    if (fullscreen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [fullscreen]);

  // Inline map (normal view)
  const inlineMap = (
    <div className="relative">
      <MapContainer
        center={[latitude, longitude]}
        zoom={13}
        scrollWheelZoom={false}
        className={aspectRatio ? "w-full" : "h-[280px] w-full rounded-lg"}
        style={{ zIndex: 0, ...(aspectRatio ? { aspectRatio } : {}) }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        <Marker position={[latitude, longitude]} icon={defaultIcon}>
          <Popup>{name}</Popup>
        </Marker>
        <InvalidateSize trigger={fullscreen} />
      </MapContainer>
      <ToggleButton fullscreen={false} onClick={toggleFullscreen} />
    </div>
  );

  // Fullscreen overlay — rendered via portal to escape parent overflow clipping
  const fullscreenOverlay = fullscreen
    ? createPortal(
        <div className="fixed inset-0 z-[9999]">
          <MapContainer
            center={[latitude, longitude]}
            zoom={13}
            scrollWheelZoom={true}
            className="h-full w-full"
            style={{ zIndex: 0 }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />
            <Marker position={[latitude, longitude]} icon={defaultIcon}>
              <Popup>{name}</Popup>
            </Marker>
            <InvalidateSize trigger={fullscreen} />
          </MapContainer>

          <ToggleButton fullscreen={true} onClick={toggleFullscreen} />

          {/* College name + exit hint */}
          <div className="absolute bottom-4 left-4 z-[10000] rounded-lg bg-white/90 backdrop-blur-sm px-4 py-2 shadow-lg">
            <p className="text-sm font-semibold text-gray-900">{name}</p>
            <p className="text-xs text-gray-500">Press Esc to exit fullscreen</p>
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      {inlineMap}
      {fullscreenOverlay}
    </>
  );
}
