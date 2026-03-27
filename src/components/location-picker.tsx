"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { FaIcon } from "@/components/ui/fa-icon";

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  place_id: number;
}

interface LocationPickerProps {
  value: string | null;
  latitude: number | null;
  longitude: number | null;
  onChange: (location: string | null, lat: number | null, lng: number | null) => void;
  placeholder?: string;
}

export function LocationPicker({
  value,
  latitude,
  longitude,
  onChange,
  placeholder = "Search for a location...",
}: LocationPickerProps) {
  const [query, setQuery] = useState(value || "");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const isFocusedRef = useRef(false);
  const cacheRef = useRef<Map<string, NominatimResult[]>>(new Map());

  // Sync external value — but only when NOT focused (avoid clobbering user typing)
  useEffect(() => {
    if (!isFocusedRef.current) {
      setQuery(value || "");
    }
  }, [value]);

  // Debounced Nominatim search with caching
  const doSearch = useCallback((q: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (q.length < 3) {
      setResults([]);
      setShowResults(false);
      return;
    }

    // Check cache first
    const cacheKey = q.toLowerCase().trim();
    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      setResults(cached);
      setShowResults(cached.length > 0);
      return;
    }

    timeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?` +
            new URLSearchParams({
              q,
              format: "json",
              limit: "5",
              countrycodes: "us",
            }),
        );
        if (res.ok) {
          const data = await res.json();
          cacheRef.current.set(cacheKey, data);
          // Keep cache bounded (max 50 entries)
          if (cacheRef.current.size > 50) {
            const firstKey = cacheRef.current.keys().next().value;
            if (firstKey) cacheRef.current.delete(firstKey);
          }
          setResults(data);
          setShowResults(data.length > 0);
        }
      } catch {
        // ignore network errors
      } finally {
        setIsSearching(false);
      }
    }, 500);
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
        isFocusedRef.current = false;
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function selectResult(result: NominatimResult) {
    const parts = result.display_name.split(", ");
    const shortName = parts.slice(0, 3).join(", ");
    setQuery(shortName);
    setShowResults(false);
    setResults([]);
    isFocusedRef.current = false;
    onChange(shortName, parseFloat(result.lat), parseFloat(result.lon));
  }

  function handleClear() {
    setQuery("");
    setResults([]);
    setShowResults(false);
    onChange(null, null, null);
  }

  const hasCoords = latitude != null && longitude != null;

  return (
    <div ref={containerRef} className="relative w-full max-w-xs min-w-[140px]">
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            const val = e.target.value;
            setQuery(val);
            if (!val) {
              onChange(null, null, null);
              setResults([]);
              setShowResults(false);
            } else {
              doSearch(val);
            }
          }}
          onFocus={() => {
            isFocusedRef.current = true;
            if (results.length > 0) setShowResults(true);
          }}
          onBlur={() => {
            // Delay to allow click on results
            setTimeout(() => {
              isFocusedRef.current = false;
            }, 200);
          }}
          placeholder={placeholder}
          className="w-full rounded border border-input bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring"
        />
        {isSearching && (
          <FaIcon icon="spinner" style="duotone" className="fa-spin text-[10px] text-muted-foreground shrink-0" />
        )}
        {!isSearching && hasCoords && (
          <FaIcon icon="circle-check" style="solid" className="text-[10px] text-green-500 shrink-0" />
        )}
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="text-muted-foreground hover:text-foreground shrink-0"
          >
            <FaIcon icon="xmark" className="text-[10px]" />
          </button>
        )}
      </div>
      {showResults && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded border bg-popover shadow-lg">
          {results.map((r) => {
            const parts = r.display_name.split(", ");
            const shortName = parts.slice(0, 3).join(", ");
            return (
              <button
                key={r.place_id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectResult(r)}
                className="w-full px-2.5 py-1.5 text-left text-xs hover:bg-muted transition-colors border-b border-border/30 last:border-0"
              >
                {shortName}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
