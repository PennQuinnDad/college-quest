"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FaIcon } from "@/components/ui/fa-icon";
import { CollegeActions } from "@/components/college-actions";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";
import type { College, UserProfile } from "@/lib/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CollegeTableProps {
  colleges: College[];
  sortBy: string;
  sortOrder: "asc" | "desc";
  onSort: (sortBy: string, sortOrder: "asc" | "desc") => void;
  favoriteIds: Set<string>;
  onToggleFavorite: (collegeId: string) => void;
  user: UserProfile | null | undefined;
}

interface ColumnDef {
  id: string;
  label: string;
  sortKey: string | null; // null = not sortable
  align: "left" | "right" | "center";
  minWidth: number;
  hiddenBelow?: "sm" | "md" | "lg";
  resizable: boolean;
  locked?: boolean; // always visible, cannot be toggled
}

// ---------------------------------------------------------------------------
// Column definitions (Type column removed)
// ---------------------------------------------------------------------------

const COLUMNS: ColumnDef[] = [
  { id: "name", label: "Name", sortKey: "name", align: "left", minWidth: 150, resizable: true, locked: true },
  { id: "location", label: "Location", sortKey: "location", align: "left", minWidth: 100, hiddenBelow: "sm", resizable: true },
  { id: "size", label: "Size", sortKey: "size", align: "left", minWidth: 60, hiddenBelow: "lg", resizable: true },
  { id: "tuition", label: "Tuition", sortKey: "tuition", align: "right", minWidth: 80, hiddenBelow: "sm", resizable: true },
  { id: "acceptance", label: "Acceptance", sortKey: "acceptance", align: "right", minWidth: 80, hiddenBelow: "md", resizable: true },
  { id: "actions", label: "", sortKey: null, align: "center", minWidth: 56, resizable: false, locked: true },
];

// Numeric columns default to descending on first click, text columns to ascending
const DESC_DEFAULT_COLUMNS = new Set(["tuition", "acceptance"]);

// Responsive breakpoint classes for hiding columns
const HIDDEN_CLASSES: Record<string, string> = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
};

// localStorage keys
const LS_COL_WIDTHS = "cq-table-col-widths";
const LS_COL_VISIBILITY = "cq-table-col-visibility";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CollegeTable({
  colleges,
  sortBy,
  sortOrder,
  onSort,
  favoriteIds,
  onToggleFavorite,
  user,
}: CollegeTableProps) {
  // ── Column widths — only stored when user has resized ──
  const [colWidths, setColWidths] = useState<Record<string, number> | null>(() => {
    try {
      const stored = localStorage.getItem(LS_COL_WIDTHS);
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return null; // null = auto layout, no custom widths
  });

  // ── Column visibility (persisted) ──
  const [visibleCols, setVisibleCols] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(LS_COL_VISIBILITY);
      if (stored) return new Set(JSON.parse(stored) as string[]);
    } catch {
      // ignore
    }
    return new Set(COLUMNS.map((c) => c.id));
  });

  // ── Column visibility dropdown ──
  const [colMenuOpen, setColMenuOpen] = useState(false);
  const colMenuRef = useRef<HTMLDivElement>(null);
  const gearBtnRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });

  // Position the portal dropdown when it opens
  useEffect(() => {
    if (colMenuOpen && gearBtnRef.current) {
      const rect = gearBtnRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      });
    }
  }, [colMenuOpen]);

  useEffect(() => {
    if (!colMenuOpen) return;
    function handleClick(e: MouseEvent) {
      if (
        colMenuRef.current && !colMenuRef.current.contains(e.target as Node) &&
        gearBtnRef.current && !gearBtnRef.current.contains(e.target as Node)
      )
        setColMenuOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setColMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [colMenuOpen]);

  function toggleColumnVisibility(colId: string) {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(colId)) next.delete(colId);
      else next.add(colId);
      try {
        localStorage.setItem(LS_COL_VISIBILITY, JSON.stringify([...next]));
      } catch {
        // ignore
      }
      return next;
    });
  }

  // ── Resize state ──
  const tableRef = useRef<HTMLTableElement>(null);
  const resizeRef = useRef<{
    columnId: string;
    startX: number;
    startWidth: number;
  } | null>(null);
  const [isResizing, setIsResizing] = useState(false);

  // Capture current column widths from the DOM before first resize
  function captureCurrentWidths(): Record<string, number> {
    if (colWidths) return colWidths;
    const widths: Record<string, number> = {};
    if (tableRef.current) {
      const ths = tableRef.current.querySelectorAll("thead th");
      let i = 0;
      for (const col of activeColumns) {
        const th = ths[i];
        if (th) widths[col.id] = (th as HTMLElement).offsetWidth;
        i++;
      }
    }
    return widths;
  }

  const onResizeStart = useCallback(
    (columnId: string, e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      // If no custom widths yet, snapshot from DOM
      const currentWidths = captureCurrentWidths();
      if (!colWidths) setColWidths(currentWidths);

      resizeRef.current = {
        columnId,
        startX: e.clientX,
        startWidth: currentWidths[columnId] ?? 100,
      };
      setIsResizing(true);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [colWidths]
  );

  const onResizeMove = useCallback(
    (e: React.PointerEvent) => {
      if (!resizeRef.current) return;
      const { columnId, startX, startWidth } = resizeRef.current;
      const col = COLUMNS.find((c) => c.id === columnId);
      const minW = col?.minWidth ?? 60;
      const delta = e.clientX - startX;
      const newWidth = Math.max(minW, startWidth + delta);
      setColWidths((prev) => ({ ...(prev ?? {}), [columnId]: newWidth }));
    },
    []
  );

  const onResizeEnd = useCallback(() => {
    if (!resizeRef.current) return;
    resizeRef.current = null;
    setIsResizing(false);
    setColWidths((current) => {
      if (current) {
        try {
          localStorage.setItem(LS_COL_WIDTHS, JSON.stringify(current));
        } catch {
          // ignore
        }
      }
      return current;
    });
  }, []);

  // ── Horizontal scroll tracking for frozen-column shadow ──
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scrolledRight, setScrolledRight] = useState(false);

  const handleScroll = useCallback(() => {
    if (wrapperRef.current) {
      setScrolledRight(wrapperRef.current.scrollLeft > 0);
    }
  }, []);

  // ── Sort handler ──
  function handleHeaderClick(sortKey: string) {
    if (sortBy === sortKey) {
      onSort(sortKey, sortOrder === "asc" ? "desc" : "asc");
    } else {
      onSort(sortKey, DESC_DEFAULT_COLUMNS.has(sortKey) ? "desc" : "asc");
    }
  }

  // ── Compute visible columns ──
  const activeColumns = COLUMNS.filter(
    (col) => col.locked || visibleCols.has(col.id)
  );

  // ── Frozen column shadow class ──
  const frozenShadow = scrolledRight
    ? "shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]"
    : "";

  // Whether we're in fixed-layout mode (user has resized columns)
  const useFixedLayout = colWidths !== null;

  return (
    <div>
      {/* Table wrapper — scrollable container for sticky header */}
      <div
        ref={wrapperRef}
        onScroll={handleScroll}
        className={cn(
          "overflow-x-auto overflow-y-auto rounded-xl border border-border bg-white",
          "max-h-[calc(100vh-280px)]",
          isResizing && "select-none"
        )}
      >
        <table
          ref={tableRef}
          className="w-full text-sm"
          style={useFixedLayout ? { tableLayout: "fixed" } : undefined}
        >
          {/* Only render colgroup when user has resized columns */}
          {useFixedLayout && (
            <colgroup>
              {activeColumns.map((col) => (
                <col
                  key={col.id}
                  style={{ width: colWidths[col.id] }}
                  className={col.hiddenBelow ? HIDDEN_CLASSES[col.hiddenBelow] : undefined}
                />
              ))}
            </colgroup>
          )}
          <thead className="sticky top-0 z-10 bg-gray-50/[.97] backdrop-blur-sm shadow-[inset_0_-1px_0_var(--color-border)]">
            <tr>
              {activeColumns.map((col) => {
                const isSorted = col.sortKey != null && sortBy === col.sortKey;
                const isSortable = col.sortKey != null;
                const isName = col.id === "name";

                return (
                  <th
                    key={col.id}
                    className={cn(
                      "relative px-4 py-3 font-medium text-muted-foreground whitespace-nowrap",
                      col.align === "right" && "text-right",
                      col.align === "center" && "text-center",
                      col.align === "left" && "text-left",
                      col.hiddenBelow && HIDDEN_CLASSES[col.hiddenBelow],
                      isSortable && "cursor-pointer select-none group transition-colors hover:bg-gray-100/60",
                      isName && "sticky left-0 z-20 bg-gray-50/[.97]",
                      isName && frozenShadow
                    )}
                    onClick={isSortable && col.sortKey ? () => handleHeaderClick(col.sortKey!) : undefined}
                    aria-sort={
                      isSorted
                        ? sortOrder === "asc"
                          ? "ascending"
                          : "descending"
                        : undefined
                    }
                  >
                    {col.id === "actions" ? (
                      /* Column visibility gear in the actions header */
                      <button
                        ref={gearBtnRef}
                        onClick={() => setColMenuOpen((p) => !p)}
                        className="rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-gray-100 hover:text-foreground"
                        title="Toggle columns"
                        aria-label="Toggle column visibility"
                      >
                        <FaIcon icon="sliders" style="duotone" className="text-xs" />
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        {/* Sort indicator */}
                        {isSortable && isSorted && (
                          <FaIcon
                            icon={sortOrder === "asc" ? "arrow-up" : "arrow-down"}
                            className="text-[10px] text-primary"
                          />
                        )}
                        {isSortable && !isSorted && col.label && (
                          <FaIcon
                            icon="sort"
                            className="text-[10px] opacity-0 transition-opacity group-hover:opacity-40"
                          />
                        )}
                      </span>
                    )}
                    {/* Resize handle */}
                    {col.resizable && (
                      <div
                        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary/30 active:bg-primary/50 transition-colors"
                        onPointerDown={(e) => onResizeStart(col.id, e)}
                        onPointerMove={onResizeMove}
                        onPointerUp={onResizeEnd}
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {colleges.map((college, rowIdx) => {
              const isEven = rowIdx % 2 === 1;
              return (
                <tr
                  key={college.id}
                  className={cn(
                    "group/row transition-colors hover:bg-amber-50/40",
                    isEven && "bg-gray-50/50"
                  )}
                >
                  {activeColumns.map((col) => {
                    const isName = col.id === "name";
                    const cellClass = cn(
                      "px-4 py-3",
                      col.align === "right" && "text-right tabular-nums",
                      col.align === "center" && "text-center",
                      col.hiddenBelow && HIDDEN_CLASSES[col.hiddenBelow],
                      !isName && "text-muted-foreground",
                      // Truncation for fixed-layout mode
                      useFixedLayout && col.id !== "actions" && "overflow-hidden text-ellipsis whitespace-nowrap",
                      // Frozen name column
                      isName && "sticky left-0 z-[5]",
                      isName && (isEven ? "bg-gray-50/50" : "bg-white"),
                      isName && frozenShadow,
                      isName && "group-hover/row:bg-amber-50/40"
                    );

                    switch (col.id) {
                      case "name":
                        return (
                          <td key={col.id} className={cellClass}>
                            <a
                              href={`/college/${college.id}`}
                              className="font-medium text-primary hover:underline"
                            >
                              {college.name}
                            </a>
                          </td>
                        );
                      case "location":
                        return (
                          <td key={col.id} className={cellClass}>
                            {college.city}, {college.state}
                          </td>
                        );
                      case "size":
                        return (
                          <td key={col.id} className={cellClass}>
                            {college.size || "---"}
                          </td>
                        );
                      case "tuition":
                        return (
                          <td key={col.id} className={cellClass}>
                            {formatCurrency(college.tuitionInState)}
                          </td>
                        );
                      case "acceptance":
                        return (
                          <td key={col.id} className={cellClass}>
                            {formatPercent(college.acceptanceRate)}
                          </td>
                        );
                      case "actions":
                        return (
                          <td key={col.id} className={cn("px-4 py-3", col.hiddenBelow && HIDDEN_CLASSES[col.hiddenBelow])}>
                            <div className="flex items-center justify-center gap-1">
                              <CollegeActions
                                collegeId={college.id}
                                isFavorite={favoriteIds.has(college.id)}
                                onToggleFavorite={() => onToggleFavorite(college.id)}
                                user={user}
                                variant="table"
                              />
                              {college.website && (
                                <a
                                  href={
                                    college.website.startsWith("http")
                                      ? college.website
                                      : `https://${college.website}`
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground hover:bg-gray-100"
                                  title="Visit website"
                                >
                                  <FaIcon
                                    icon="arrow-up-right-from-square"
                                    style="duotone"
                                    className="text-sm"
                                  />
                                </a>
                              )}
                            </div>
                          </td>
                        );
                      default:
                        return null;
                    }
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Column visibility dropdown — rendered via portal to escape overflow clipping */}
      {colMenuOpen &&
        createPortal(
          <div
            ref={colMenuRef}
            className="fixed z-[9999] w-48 overflow-hidden rounded-lg border border-border bg-white shadow-lg"
            style={{ top: menuPos.top, right: menuPos.right }}
          >
            <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Show columns
            </div>
            {COLUMNS.filter((c) => !c.locked).map((col2) => (
              <button
                key={col2.id}
                onClick={() => toggleColumnVisibility(col2.id)}
                className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm transition-colors hover:bg-gray-50"
              >
                <FaIcon
                  icon={visibleCols.has(col2.id) ? "square-check" : "square"}
                  style={visibleCols.has(col2.id) ? "solid" : "regular"}
                  className={cn(
                    "text-sm",
                    visibleCols.has(col2.id) ? "text-primary" : "text-muted-foreground"
                  )}
                />
                {col2.label}
              </button>
            ))}
            {colWidths && (
              <>
                <div className="border-t border-border" />
                <button
                  onClick={() => {
                    setColWidths(null);
                    try { localStorage.removeItem(LS_COL_WIDTHS); } catch { /* ignore */ }
                    setColMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-gray-50"
                >
                  <FaIcon icon="arrow-rotate-left" className="text-sm" />
                  Reset column widths
                </button>
              </>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
