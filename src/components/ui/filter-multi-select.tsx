"use client";

import { useState, useCallback, useRef } from "react";
import { FaIcon } from "@/components/ui/fa-icon";
import { useClickOutside } from "@/hooks/use-click-outside";
import { cn } from "@/lib/utils";

interface FilterMultiSelectProps {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  counts?: Record<string, number>;
}

export function FilterMultiSelect({
  label,
  options,
  selected,
  onToggle,
  counts,
}: FilterMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [filterText, setFilterText] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const closeFilter = useCallback(() => {
    setOpen(false);
    setFilterText("");
  }, []);
  useClickOutside(ref, closeFilter, open);

  const filtered = filterText
    ? options.filter((o) =>
        o.toLowerCase().includes(filterText.toLowerCase())
      )
    : options;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors whitespace-nowrap",
          selected.length > 0
            ? "border-primary bg-primary/5 text-primary font-medium"
            : "border-border bg-white text-muted-foreground hover:border-gray-400 hover:text-foreground"
        )}
      >
        <span>
          {selected.length === 0
            ? label
            : selected.length === 1
              ? selected[0]
              : `${label} (${selected.length})`}
        </span>
        <FaIcon
          icon="chevron-down"
          className={cn(
            "text-[10px] shrink-0 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[200px] overflow-hidden rounded-lg border border-border bg-white shadow-lg">
          {options.length > 8 && (
            <div className="p-2 border-b border-border">
              <input
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder={`Search ${label.toLowerCase()}...`}
                className="h-8 w-full rounded-md border border-border px-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                autoFocus
              />
            </div>
          )}
          <div className="max-h-56 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                No options found
              </div>
            ) : (
              filtered.map((option) => {
                const isSelected = selected.includes(option);
                return (
                  <button
                    key={option}
                    onClick={() => onToggle(option)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-sm px-3 py-1.5 text-sm transition-colors text-left",
                      isSelected
                        ? "bg-amber-50 text-foreground"
                        : "text-foreground hover:bg-gray-50"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-colors",
                        isSelected
                          ? "border-primary bg-primary text-white"
                          : "border-gray-300"
                      )}
                    >
                      {isSelected && <FaIcon icon="check" className="text-[10px]" />}
                    </div>
                    <span className="truncate">{option}</span>
                    {counts && counts[option] != null && (
                      <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                        {counts[option].toLocaleString()}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
