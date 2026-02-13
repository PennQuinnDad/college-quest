"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  GraduationCap,
  Search,
  ArrowLeft,
  ExternalLink,
  LayoutGrid,
  LayoutList,
  ArrowUpDown,
  MapPin,
  Building,
  Loader2,
  BookOpen,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface School {
  id: string;
  name: string;
  college_id: string;
  college_name: string | null;
  college_city: string | null;
  college_state: string | null;
  category: string | null;
  cip_code: string | null;
  website: string | null;
  description: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
}

interface ProgramGroup {
  name: string;
  category: string | null;
  colleges: {
    id: string;
    collegeId: string;
    collegeName: string | null;
    collegeCity: string | null;
    collegeState: string | null;
    cipCode: string | null;
    website: string | null;
  }[];
}

type SortKey = "name" | "category" | "colleges";
type ViewMode = "table" | "grid";

export default function SchoolsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedProgram, setSelectedProgram] = useState<ProgramGroup | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: schools = [], isLoading: schoolsLoading, error: schoolsError } = useQuery<School[]>({
    queryKey: ["schools"],
    queryFn: async () => {
      const res = await fetch("/api/schools");
      if (!res.ok) throw new Error("Failed to fetch schools");
      return res.json();
    },
  });

  const { data: categories = [], isLoading: categoriesLoading, error: categoriesError } = useQuery<string[]>({
    queryKey: ["schools-categories"],
    queryFn: async () => {
      const res = await fetch("/api/schools/categories");
      if (!res.ok) throw new Error("Failed to fetch categories");
      return res.json();
    },
  });

  const programGroups = useMemo(() => {
    const groupMap = new Map<string, ProgramGroup>();

    for (const school of schools) {
      const key = school.name.toLowerCase().trim();
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          name: school.name,
          category: school.category,
          colleges: [],
        });
      }
      groupMap.get(key)!.colleges.push({
        id: school.id,
        collegeId: school.college_id,
        collegeName: school.college_name,
        collegeCity: school.college_city,
        collegeState: school.college_state,
        cipCode: school.cip_code,
        website: school.website,
      });
    }

    return Array.from(groupMap.values());
  }, [schools]);

  const filtered = useMemo(() => {
    let result = programGroups;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.category && p.category.toLowerCase().includes(q))
      );
    }

    if (categoryFilter && categoryFilter !== "all") {
      result = result.filter((p) => p.category === categoryFilter);
    }

    result.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") {
        cmp = a.name.localeCompare(b.name);
      } else if (sortKey === "category") {
        cmp = (a.category || "").localeCompare(b.category || "");
      } else if (sortKey === "colleges") {
        cmp = a.colleges.length - b.colleges.length;
      }
      return sortAsc ? cmp : -cmp;
    });

    return result;
  }, [programGroups, searchQuery, categoryFilter, sortKey, sortAsc]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  function openProgramDetail(program: ProgramGroup) {
    setSelectedProgram(program);
    setDialogOpen(true);
  }

  const isLoading = schoolsLoading || categoriesLoading;
  const hasError = schoolsError || categoriesError;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#fbfbf8" }}>
      {/* Header */}
      <header
        className="border-b bg-primary"
      >
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-5">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-white/80 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Home
          </Link>
          <Separator orientation="vertical" className="h-6 bg-white/20" />
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">
                Programs & Fields of Study
              </h1>
              <p className="text-sm text-white/70">
                Browse academic programs across all colleges
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Filters Bar */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            {/* Search */}
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search programs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Category Filter */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[260px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* View Mode + Sort */}
          <div className="flex items-center gap-2">
            <Select
              value={sortKey}
              onValueChange={(val) => setSortKey(val as SortKey)}
            >
              <SelectTrigger className="w-[160px]">
                <ArrowUpDown className="mr-2 h-3.5 w-3.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Sort by Name</SelectItem>
                <SelectItem value="category">Sort by Category</SelectItem>
                <SelectItem value="colleges">Sort by Colleges</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortAsc((prev) => !prev)}
              title={sortAsc ? "Ascending" : "Descending"}
            >
              <ArrowUpDown className={cn("h-4 w-4", !sortAsc && "rotate-180")} />
            </Button>

            <Separator orientation="vertical" className="mx-1 h-8" />

            <Button
              variant={viewMode === "table" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("table")}
              title="Table View"
              className={cn(viewMode === "table" && "bg-primary")}
            >
              <LayoutList className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("grid")}
              title="Grid View"
              className={cn(viewMode === "grid" && "bg-primary")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 flex items-center gap-4 text-sm text-muted-foreground">
          <span>
            {filtered.length} program{filtered.length !== 1 ? "s" : ""} found
          </span>
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchQuery("")}
              className="h-auto px-2 py-1 text-xs"
            >
              Clear search
            </Button>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">Loading programs...</p>
          </div>
        )}

        {/* Error State */}
        {!isLoading && hasError && (
          <Card className="mx-auto max-w-md">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-destructive/60" />
              <h3 className="mt-4 text-lg font-medium text-foreground">
                Something went wrong
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Failed to load programs. Please try refreshing the page.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && !hasError && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground/40" />
            <h3 className="mt-4 text-lg font-medium text-foreground">
              No programs found
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Try adjusting your search or category filter.
            </p>
          </div>
        )}

        {/* Table View */}
        {!isLoading && filtered.length > 0 && viewMode === "table" && (
          <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50/80">
                    <th
                      className="cursor-pointer px-4 py-3 text-left font-medium text-muted-foreground hover:text-foreground"
                      onClick={() => handleSort("name")}
                    >
                      <span className="flex items-center gap-1">
                        Program Name
                        {sortKey === "name" && (
                          <ArrowUpDown className="h-3 w-3" />
                        )}
                      </span>
                    </th>
                    <th
                      className="cursor-pointer px-4 py-3 text-left font-medium text-muted-foreground hover:text-foreground"
                      onClick={() => handleSort("category")}
                    >
                      <span className="flex items-center gap-1">
                        Category
                        {sortKey === "category" && (
                          <ArrowUpDown className="h-3 w-3" />
                        )}
                      </span>
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      College Name
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      College Location
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      CIP Code
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Website
                    </th>
                    <th
                      className="cursor-pointer px-4 py-3 text-left font-medium text-muted-foreground hover:text-foreground"
                      onClick={() => handleSort("colleges")}
                    >
                      <span className="flex items-center gap-1">
                        # Colleges
                        {sortKey === "colleges" && (
                          <ArrowUpDown className="h-3 w-3" />
                        )}
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((program) => {
                    const first = program.colleges[0];
                    return (
                      <tr
                        key={program.name}
                        className="cursor-pointer border-b transition-colors hover:bg-gray-50/50 last:border-b-0"
                        onClick={() => openProgramDetail(program)}
                      >
                        <td className="px-4 py-3 font-medium text-foreground">
                          {program.name}
                        </td>
                        <td className="px-4 py-3">
                          {program.category ? (
                            <Badge
                              variant="secondary"
                              className="bg-amber-100 text-amber-800 hover:bg-amber-200"
                            >
                              {program.category}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">--</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {first?.collegeName || "--"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {first?.collegeCity && first?.collegeState
                            ? `${first.collegeCity}, ${first.collegeState}`
                            : first?.collegeState || "--"}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {first?.cipCode || "--"}
                        </td>
                        <td className="px-4 py-3">
                          {first?.website ? (
                            <a
                              href={first.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-primary hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Visit
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground">--</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline">
                            {program.colleges.length}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Grid View */}
        {!isLoading && filtered.length > 0 && viewMode === "grid" && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((program) => {
              const first = program.colleges[0];
              return (
                <Card
                  key={program.name}
                  className="cursor-pointer transition-shadow hover:shadow-md"
                  onClick={() => openProgramDetail(program)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base font-semibold leading-tight">
                        {program.name}
                      </CardTitle>
                      <Badge variant="outline" className="shrink-0">
                        {program.colleges.length}
                      </Badge>
                    </div>
                    {program.category && (
                      <Badge
                        variant="secondary"
                        className="mt-1 w-fit bg-amber-100 text-amber-800 hover:bg-amber-200"
                      >
                        {program.category}
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2 text-sm text-muted-foreground">
                      {first?.collegeName && (
                        <div className="flex items-center gap-2">
                          <Building className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{first.collegeName}</span>
                        </div>
                      )}
                      {(first?.collegeCity || first?.collegeState) && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span>
                            {first.collegeCity && first.collegeState
                              ? `${first.collegeCity}, ${first.collegeState}`
                              : first.collegeState || first.collegeCity}
                          </span>
                        </div>
                      )}
                      {program.colleges.length > 1 && (
                        <p className="text-xs text-primary">
                          + {program.colleges.length - 1} more college
                          {program.colleges.length - 1 !== 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Program Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
          {selectedProgram && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  {selectedProgram.name}
                </DialogTitle>
                <DialogDescription>
                  {selectedProgram.category && (
                    <Badge
                      variant="secondary"
                      className="mt-1 bg-amber-100 text-amber-800"
                    >
                      {selectedProgram.category}
                    </Badge>
                  )}
                </DialogDescription>
              </DialogHeader>
              <Separator />
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Offered at {selectedProgram.colleges.length} college
                  {selectedProgram.colleges.length !== 1 ? "s" : ""}
                </h3>
              </div>
              <div className="space-y-3">
                {selectedProgram.colleges.map((college) => (
                  <div
                    key={college.id}
                    className="flex items-start justify-between rounded-lg border p-4 transition-colors hover:bg-gray-50/50"
                  >
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">
                        {college.collegeName || "Unknown College"}
                      </p>
                      {(college.collegeCity || college.collegeState) && (
                        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          {college.collegeCity && college.collegeState
                            ? `${college.collegeCity}, ${college.collegeState}`
                            : college.collegeState || college.collegeCity}
                        </p>
                      )}
                      {college.cipCode && (
                        <p className="text-xs text-muted-foreground">
                          CIP: {college.cipCode}
                        </p>
                      )}
                    </div>
                    {college.website && (
                      <a
                        href={college.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0"
                      >
                        <Button variant="outline" size="sm">
                          <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                          Website
                        </Button>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
