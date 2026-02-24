"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-user";
import { FaIcon } from "@/components/ui/fa-icon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn, formatCurrency, formatPercent, formatNumber } from "@/lib/utils";
import type { College } from "@/lib/types";

// ---------------------------------------------------------------------------
// Compare row helper
// ---------------------------------------------------------------------------

function CompareRow({
  label,
  values,
  format = "text",
  highlight = "none",
}: {
  label: string;
  values: (string | number | null | undefined)[];
  format?: "text" | "currency" | "percent" | "number";
  highlight?: "none" | "lowest" | "highest";
}) {
  const formatted = values.map((v) => {
    if (v == null || v === undefined) return "---";
    switch (format) {
      case "currency": return formatCurrency(v as number);
      case "percent": return formatPercent(v as number);
      case "number": return formatNumber(v as number);
      default: return String(v);
    }
  });

  // Find best value for highlighting
  let bestIdx = -1;
  if (highlight !== "none") {
    const nums = values.map((v) => (typeof v === "number" ? v : null));
    const validNums = nums.filter((n): n is number => n != null);
    if (validNums.length > 0) {
      const target = highlight === "lowest"
        ? Math.min(...validNums)
        : Math.max(...validNums);
      bestIdx = nums.indexOf(target);
    }
  }

  return (
    <tr className="border-b border-border last:border-0">
      <td className="py-2.5 pr-4 text-xs font-medium text-muted-foreground whitespace-nowrap">
        {label}
      </td>
      {formatted.map((val, i) => (
        <td
          key={i}
          className={cn(
            "py-2.5 px-3 text-sm text-center",
            i === bestIdx && "font-semibold text-primary bg-primary/5",
          )}
        >
          {val}
        </td>
      ))}
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Main compare page
// ---------------------------------------------------------------------------

export default function ComparePage() {
  const { data: user, isLoading: userLoading } = useUser();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Fetch user's favorites
  const { data: favoritesData } = useQuery<{ favorites: string[] }>({
    queryKey: ["favorites"],
    queryFn: async () => {
      const res = await fetch("/api/favorites");
      if (!res.ok) return { favorites: [] };
      return res.json();
    },
    enabled: !!user,
  });

  const favoriteIds = favoritesData?.favorites ?? [];

  // Fetch college details for all favorites
  const { data: collegesData, isLoading: collegesLoading } = useQuery<{
    colleges: College[];
  }>({
    queryKey: ["compare-colleges", favoriteIds],
    queryFn: async () => {
      if (favoriteIds.length === 0) return { colleges: [] };
      const qs = new URLSearchParams();
      qs.set("favoriteIds", favoriteIds.join(","));
      qs.set("limit", String(favoriteIds.length));
      const res = await fetch(`/api/colleges?${qs.toString()}`);
      if (!res.ok) return { colleges: [] };
      return res.json();
    },
    enabled: favoriteIds.length > 0,
  });

  const allColleges = useMemo(
    () => collegesData?.colleges ?? [],
    [collegesData?.colleges],
  );

  const compareColleges = useMemo(() => {
    if (selectedIds.size === 0) return allColleges.slice(0, 4);
    return allColleges.filter((c) => selectedIds.has(c.id));
  }, [allColleges, selectedIds]);

  function toggleCollege(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 5) {
        next.add(id);
      }
      return next;
    });
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
            <p className="text-muted-foreground">Please log in to compare colleges.</p>
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
            <h1 className="text-lg font-semibold">Compare Colleges</h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FaIcon icon="circle-info" style="duotone" className="text-sm" />
            Select up to 5 colleges to compare
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {collegesLoading ? (
          <div className="py-20 text-center text-muted-foreground">
            <FaIcon icon="spinner" style="duotone" className="fa-spin mr-2 text-xl" />
            <p className="mt-2 text-sm">Loading your favorites...</p>
          </div>
        ) : allColleges.length === 0 ? (
          <div className="py-20 text-center">
            <FaIcon icon="scale-balanced" style="duotone" className="mb-4 text-4xl text-gray-300" />
            <h2 className="text-lg font-semibold">No Colleges to Compare</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Favorite some colleges first, then come back to compare them side-by-side.
            </p>
            <Link href="/">
              <Button className="mt-6">
                <FaIcon icon="search" style="solid" className="mr-2 text-sm" />
                Explore Colleges
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {/* College selector chips */}
            <div className="mb-6">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Your favorites ({allColleges.length}):
              </p>
              <div className="flex flex-wrap gap-2">
                {allColleges.map((c) => {
                  const isSelected = selectedIds.has(c.id) || (selectedIds.size === 0 && compareColleges.includes(c));
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
            </div>

            {/* Comparison table */}
            {compareColleges.length > 0 && (
              <Card>
                <CardContent className="overflow-x-auto py-4">
                  <table className="w-full min-w-[600px]">
                    <thead>
                      <tr className="border-b-2 border-border">
                        <th className="py-3 pr-4 text-left text-xs font-semibold text-muted-foreground">
                          Metric
                        </th>
                        {compareColleges.map((c) => (
                          <th key={c.id} className="px-3 py-3 text-center">
                            <Link
                              href={`/college/${c.id}`}
                              className="text-sm font-semibold text-primary hover:underline"
                            >
                              {c.name}
                            </Link>
                            <p className="text-[10px] text-muted-foreground font-normal">
                              {c.city}, {c.state}
                            </p>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <CompareRow
                        label="Type"
                        values={compareColleges.map((c) => c.type)}
                      />
                      <CompareRow
                        label="Size"
                        values={compareColleges.map((c) => c.size)}
                      />
                      <CompareRow
                        label="Enrollment"
                        values={compareColleges.map((c) => c.enrollment)}
                        format="number"
                      />
                      <CompareRow
                        label="Acceptance Rate"
                        values={compareColleges.map((c) => c.acceptanceRate)}
                        format="percent"
                      />
                      <CompareRow
                        label="In-State Tuition"
                        values={compareColleges.map((c) => c.tuitionInState)}
                        format="currency"
                        highlight="lowest"
                      />
                      <CompareRow
                        label="Out-of-State Tuition"
                        values={compareColleges.map((c) => c.tuitionOutOfState)}
                        format="currency"
                        highlight="lowest"
                      />
                      <CompareRow
                        label="Avg Net Cost"
                        values={compareColleges.map((c) => c.netCost)}
                        format="currency"
                        highlight="lowest"
                      />
                      <CompareRow
                        label="SAT Math"
                        values={compareColleges.map((c) => c.satMath)}
                        format="number"
                      />
                      <CompareRow
                        label="SAT Reading"
                        values={compareColleges.map((c) => c.satReading)}
                        format="number"
                      />
                      <CompareRow
                        label="ACT Composite"
                        values={compareColleges.map((c) => c.actComposite)}
                        format="number"
                      />
                      <CompareRow
                        label="Graduation Rate"
                        values={compareColleges.map((c) => c.graduationRate)}
                        format="percent"
                        highlight="highest"
                      />
                      <CompareRow
                        label="Jesuit"
                        values={compareColleges.map((c) => c.jesuit ? "Yes" : "No")}
                      />
                      <CompareRow
                        label="Region"
                        values={compareColleges.map((c) => c.region)}
                      />
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}
