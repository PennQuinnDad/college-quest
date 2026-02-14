"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FaIcon } from "@/components/ui/fa-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CollegeActions } from "@/components/college-actions";
import { CollegeTable } from "@/components/college-table";
const CollegeMapView = dynamic(() => import("@/components/college-map-view"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[600px] items-center justify-center rounded-xl border border-border bg-gray-50">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  ),
});
import { cn, formatCurrency, formatPercent, formatNumber } from "@/lib/utils";
import type {
  College,
  ViewMode,
  CollegeSearchParams,
  SavedFilter,
  UserProfile,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildQueryString(params: CollegeSearchParams): string {
  const sp = new URLSearchParams();
  if (params.query) sp.set("query", params.query);
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  if (params.limit && params.limit !== 12) sp.set("limit", String(params.limit));
  if (params.sortBy && params.sortBy !== "name") sp.set("sortBy", params.sortBy);
  if (params.sortOrder && params.sortOrder !== "asc")
    sp.set("sortOrder", params.sortOrder);
  if (params.states) sp.set("states", params.states);
  if (params.regions) sp.set("regions", params.regions);
  if (params.types) sp.set("types", params.types);
  if (params.sizes) sp.set("sizes", params.sizes);
  if (params.acceptanceRanges) sp.set("acceptanceRanges", params.acceptanceRanges);
  if (params.jesuitOnly === "true") sp.set("jesuitOnly", "true");
  if (params.programCategories) sp.set("programCategories", params.programCategories);
  if (params.favoriteIds) sp.set("favoriteIds", params.favoriteIds);
  return sp.toString();
}

function parseSearchParams(sp: URLSearchParams): CollegeSearchParams {
  return {
    query: sp.get("query") || undefined,
    page: sp.get("page") ? parseInt(sp.get("page")!) : 1,
    limit: sp.get("limit") ? parseInt(sp.get("limit")!) : 12,
    sortBy: sp.get("sortBy") || "name",
    sortOrder: (sp.get("sortOrder") as "asc" | "desc") || "asc",
    states: sp.get("states") || undefined,
    regions: sp.get("regions") || undefined,
    types: sp.get("types") || undefined,
    sizes: sp.get("sizes") || undefined,
    acceptanceRanges: sp.get("acceptanceRanges") || undefined,
    jesuitOnly: sp.get("jesuitOnly") || undefined,
    programCategories: sp.get("programCategories") || undefined,
    favoriteIds: sp.get("favoriteIds") || undefined,
  };
}

const SIZES = ["Small", "Medium", "Large"];

const SORT_OPTIONS = [
  { value: "name", label: "Name" },
  { value: "tuition", label: "Tuition" },
  { value: "enrollment", label: "Enrollment" },
  { value: "acceptance", label: "Acceptance Rate" },
  { value: "location", label: "Location" },
];

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function HomePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
      <HomePageContent />
    </Suspense>
  );
}

function HomePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  // ---- Derived filter state from URL ----
  const params = useMemo(() => parseSearchParams(searchParams), [searchParams]);

  // ---- Local UI state ----
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [searchInput, setSearchInput] = useState(params.query || "");
  const [autocompleteOpen, setAutocompleteOpen] = useState(false);
  const [autocompleteIndex, setAutocompleteIndex] = useState(-1);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [saveFilterName, setSaveFilterName] = useState("");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [exportCopied, setExportCopied] = useState(false);
  const [copyDropdownOpen, setCopyDropdownOpen] = useState(false);
  const copyDropdownRef = useRef<HTMLDivElement>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // ---- Load saved filters from localStorage ----
  useEffect(() => {
    try {
      const stored = localStorage.getItem("cq-saved-filters");
      if (stored) setSavedFilters(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  // ---- Copy dropdown: click-outside & Escape ----
  useEffect(() => {
    if (!copyDropdownOpen) return;
    function handleClick(e: MouseEvent) {
      if (copyDropdownRef.current && !copyDropdownRef.current.contains(e.target as Node)) {
        setCopyDropdownOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setCopyDropdownOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [copyDropdownOpen]);

  // ---- Push new params to URL ----
  const updateParams = useCallback(
    (updates: Partial<CollegeSearchParams>) => {
      const next = { ...params, ...updates };
      // Reset page when filters change (unless page is specifically being set)
      if (!("page" in updates)) next.page = 1;
      const qs = buildQueryString(next);
      router.push(qs ? `/?${qs}` : "/", { scroll: false });
    },
    [params, router]
  );

  // ---- User auth ----
  const { data: user } = useQuery<UserProfile | null>({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await fetch("/api/me");
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
  });

  // ---- Favorites ----
  const { data: favoritesData } = useQuery<{ favorites: string[] }>({
    queryKey: ["favorites"],
    queryFn: async () => {
      const res = await fetch("/api/favorites");
      if (!res.ok) return { favorites: [] };
      return res.json();
    },
    enabled: !!user,
  });

  const favoriteIds = useMemo(
    () => new Set(favoritesData?.favorites || []),
    [favoritesData]
  );

  const toggleFavoriteMutation = useMutation({
    mutationFn: async (collegeId: string) => {
      if (favoriteIds.has(collegeId)) {
        await fetch(`/api/favorites/${collegeId}`, { method: "DELETE" });
      } else {
        await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ collegeId }),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    },
  });

  // ---- Filter options ----
  const { data: stateOptions = [] } = useQuery<string[]>({
    queryKey: ["filter-states"],
    queryFn: async () => {
      const res = await fetch("/api/colleges/filters/states");
      return res.json();
    },
  });

  const { data: regionOptions = [] } = useQuery<string[]>({
    queryKey: ["filter-regions"],
    queryFn: async () => {
      const res = await fetch("/api/colleges/filters/regions");
      return res.json();
    },
  });

  const { data: typeOptions = [] } = useQuery<string[]>({
    queryKey: ["filter-types"],
    queryFn: async () => {
      const res = await fetch("/api/colleges/filters/types");
      return res.json();
    },
  });

  const { data: acceptanceRangeOptions = [] } = useQuery<string[]>({
    queryKey: ["filter-acceptance-ranges"],
    queryFn: async () => {
      const res = await fetch("/api/colleges/filters/acceptance-ranges");
      return res.json();
    },
  });

  const { data: programCategoryOptions = [] } = useQuery<string[]>({
    queryKey: ["filter-program-categories"],
    queryFn: async () => {
      const res = await fetch("/api/schools/categories");
      return res.json();
    },
  });

  // ---- Colleges query ----
  const collegeQueryParams = useMemo(() => {
    const p = { ...params };
    if (showFavoritesOnly && favoriteIds.size > 0) {
      p.favoriteIds = Array.from(favoriteIds).join(",");
    }
    // Map view needs all results (up to 5000), not a single page
    if (viewMode === "map") {
      p.limit = 5000;
      p.page = 1;
    }
    return p;
  }, [params, showFavoritesOnly, favoriteIds, viewMode]);

  const { data: collegesData, isLoading: collegesLoading, error: collegesError } = useQuery<{
    colleges: College[];
    total: number;
  }>({
    queryKey: ["colleges", collegeQueryParams],
    queryFn: async () => {
      const qs = buildQueryString(collegeQueryParams);
      const res = await fetch(`/api/colleges?${qs}`);
      if (!res.ok) throw new Error("Failed to fetch colleges");
      return res.json();
    },
  });

  const colleges = collegesData?.colleges || [];
  const totalResults = collegesData?.total || 0;
  const currentPage = params.page || 1;
  const pageSize = params.limit || 12;
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));

  // ---- Autocomplete ----
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearchTerm(searchInput);
    }, 300);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchInput]);

  const { data: autocompleteResults = [] } = useQuery<
    { id: string; name: string }[]
  >({
    queryKey: ["autocomplete", debouncedSearchTerm],
    queryFn: async () => {
      const res = await fetch(
        `/api/colleges/autocomplete?q=${encodeURIComponent(debouncedSearchTerm)}`
      );
      if (!res.ok) return [];
      return res.json();
    },
    enabled: debouncedSearchTerm.length >= 2,
  });

  // Close autocomplete when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        autocompleteRef.current &&
        !autocompleteRef.current.contains(e.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(e.target as Node)
      ) {
        setAutocompleteOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSearchKeyDown(e: React.KeyboardEvent) {
    if (!autocompleteOpen || autocompleteResults.length === 0) {
      if (e.key === "Enter") {
        e.preventDefault();
        updateParams({ query: searchInput || undefined });
        setAutocompleteOpen(false);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setAutocompleteIndex((i) =>
        i < autocompleteResults.length - 1 ? i + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAutocompleteIndex((i) =>
        i > 0 ? i - 1 : autocompleteResults.length - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (autocompleteIndex >= 0) {
        const item = autocompleteResults[autocompleteIndex];
        setSearchInput(item.name);
        updateParams({ query: item.name });
      } else {
        updateParams({ query: searchInput || undefined });
      }
      setAutocompleteOpen(false);
      setAutocompleteIndex(-1);
    } else if (e.key === "Escape") {
      setAutocompleteOpen(false);
      setAutocompleteIndex(-1);
    }
  }

  function handleAutocompleteSelect(item: { id: string; name: string }) {
    setSearchInput(item.name);
    updateParams({ query: item.name });
    setAutocompleteOpen(false);
    setAutocompleteIndex(-1);
  }

  // ---- Multi-select filter helpers ----
  function toggleMultiFilter(
    key: "states" | "regions" | "types" | "sizes" | "acceptanceRanges" | "programCategories",
    value: string
  ) {
    const current = params[key]
      ? params[key]!.split(",").map((s) => s.trim())
      : [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    updateParams({ [key]: next.length > 0 ? next.join(",") : undefined });
  }

  function isFilterSelected(
    key: "states" | "regions" | "types" | "sizes" | "acceptanceRanges" | "programCategories",
    value: string
  ): boolean {
    if (!params[key]) return false;
    return params[key]!.split(",")
      .map((s) => s.trim())
      .includes(value);
  }

  // ---- Active filters ----
  const activeFilters = useMemo(() => {
    const filters: { key: string; paramKey: string; value: string }[] = [];
    const addMulti = (
      paramKey: "states" | "regions" | "types" | "sizes" | "acceptanceRanges" | "programCategories",
      label: string
    ) => {
      if (params[paramKey]) {
        params[paramKey]!.split(",")
          .map((s) => s.trim())
          .forEach((v) => {
            filters.push({ key: `${label}: ${v}`, paramKey, value: v });
          });
      }
    };
    addMulti("states", "State");
    addMulti("regions", "Region");
    addMulti("types", "Type");
    addMulti("sizes", "Size");
    addMulti("acceptanceRanges", "Acceptance");
    addMulti("programCategories", "Program");
    if (params.jesuitOnly === "true") {
      filters.push({ key: "Jesuit Only", paramKey: "jesuitOnly", value: "true" });
    }
    return filters;
  }, [params]);

  function removeFilter(paramKey: string, value: string) {
    if (paramKey === "jesuitOnly") {
      updateParams({ jesuitOnly: undefined });
      return;
    }
    const k = paramKey as "states" | "regions" | "types" | "sizes" | "acceptanceRanges" | "programCategories";
    const current = params[k]
      ? params[k]!.split(",").map((s) => s.trim())
      : [];
    const next = current.filter((v) => v !== value);
    updateParams({ [k]: next.length > 0 ? next.join(",") : undefined });
  }

  function clearAllFilters() {
    updateParams({
      states: undefined,
      regions: undefined,
      types: undefined,
      sizes: undefined,
      acceptanceRanges: undefined,
      jesuitOnly: undefined,
      programCategories: undefined,
      query: undefined,
    });
    setSearchInput("");
    setShowFavoritesOnly(false);
  }

  // ---- Saved filters ----
  function saveCurrentFilter() {
    if (!saveFilterName.trim()) return;
    const newFilter: SavedFilter = {
      id: crypto.randomUUID(),
      name: saveFilterName.trim(),
      params: { ...params },
    };
    const updated = [newFilter, ...savedFilters].slice(0, 5);
    setSavedFilters(updated);
    localStorage.setItem("cq-saved-filters", JSON.stringify(updated));
    setSaveFilterName("");
    setSaveDialogOpen(false);
  }

  function loadSavedFilter(filter: SavedFilter) {
    const qs = buildQueryString(filter.params);
    router.push(qs ? `/?${qs}` : "/", { scroll: false });
    setSearchInput(filter.params.query || "");
  }

  function deleteSavedFilter(id: string) {
    const updated = savedFilters.filter((f) => f.id !== id);
    setSavedFilters(updated);
    localStorage.setItem("cq-saved-filters", JSON.stringify(updated));
  }

  // ---- Copy favorites for AI platforms ----
  type AIPlatform = "chatgpt" | "gemini" | "claude";

  function buildCollegeMarkdown(list: College[]): string {
    const lines: string[] = [];
    for (const c of list) {
      lines.push(`## ${c.name}`);
      lines.push(`- **Location:** ${c.city}, ${c.state}`);
      if (c.type) lines.push(`- **Type:** ${c.type}`);
      if (c.size) lines.push(`- **Size:** ${c.size}`);
      if (c.enrollment) lines.push(`- **Enrollment:** ${formatNumber(c.enrollment)}`);
      if (c.tuitionInState != null)
        lines.push(`- **Tuition (In-State):** ${formatCurrency(c.tuitionInState)}`);
      if (c.tuitionOutOfState != null)
        lines.push(`- **Tuition (Out-of-State):** ${formatCurrency(c.tuitionOutOfState)}`);
      if (c.netCost != null)
        lines.push(`- **Average Net Cost:** ${formatCurrency(c.netCost)}`);
      if (c.acceptanceRate != null)
        lines.push(`- **Acceptance Rate:** ${formatPercent(c.acceptanceRate)}`);
      if (c.satMath != null || c.satReading != null) {
        const parts: string[] = [];
        if (c.satMath != null) parts.push(`Math ${c.satMath}`);
        if (c.satReading != null) parts.push(`Reading ${c.satReading}`);
        lines.push(`- **SAT:** ${parts.join(", ")}`);
      }
      if (c.actComposite != null)
        lines.push(`- **ACT Composite:** ${c.actComposite}`);
      if (c.graduationRate != null)
        lines.push(`- **Graduation Rate:** ${formatPercent(c.graduationRate)}`);
      if (c.jesuit) lines.push(`- **Jesuit:** Yes`);
      if (c.programs && c.programs.length > 0)
        lines.push(`- **Programs:** ${c.programs.join(", ")}`);
      if (c.description) lines.push(`- **Description:** ${c.description}`);
      if (c.website) lines.push(`- **Website:** ${c.website}`);
      lines.push("");
    }
    return lines.join("\n");
  }

  const AI_PROMPTS: Record<AIPlatform, { intro: string; closing: string }> = {
    chatgpt: {
      intro:
        "Here is my college favorites list from College Quest. I'd like your help comparing these schools.\n",
      closing:
        "Please create a comparison table of these colleges highlighting key differences, then give me your top recommendations and explain why.",
    },
    gemini: {
      intro:
        "I've saved the following colleges to my favorites in College Quest and I'd like your analysis.\n",
      closing:
        "Please analyze these colleges, list the pros and cons of each, and help me narrow down my choices based on the data above.",
    },
    claude: {
      intro:
        "Below is my saved college list from College Quest. I'd love a thoughtful comparison.\n",
      closing:
        "Please compare these colleges thoughtfully, assess which might be the best fit for different student priorities (cost, selectivity, size, location), and share your overall recommendations.",
    },
  };

  async function getFavoriteColleges(): Promise<College[]> {
    const favColleges = colleges.filter((c) => favoriteIds.has(c.id));
    if (favColleges.length === 0 && favoriteIds.size > 0) {
      const qs = new URLSearchParams();
      qs.set("favoriteIds", Array.from(favoriteIds).join(","));
      qs.set("limit", String(favoriteIds.size));
      const res = await fetch(`/api/colleges?${qs.toString()}`);
      if (res.ok) {
        const data = await res.json();
        return data.colleges || [];
      }
    }
    return favColleges;
  }

  async function copyForAI(platform: AIPlatform) {
    const list = await getFavoriteColleges();
    const prompt = AI_PROMPTS[platform];
    let text: string;
    if (list.length === 0) {
      text = "# My College Quest Favorites\n\nNo favorites saved yet.";
    } else {
      text = `# My College Quest Favorites\n\n${prompt.intro}\n${buildCollegeMarkdown(list)}\n---\n\n${prompt.closing}`;
    }
    try {
      await navigator.clipboard.writeText(text);
      setExportCopied(true);
      setCopyDropdownOpen(false);
      setTimeout(() => setExportCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  }

  // ---- Store search result IDs in sessionStorage for detail page nav ----
  useEffect(() => {
    if (colleges.length > 0) {
      sessionStorage.setItem(
        "cq-search-results",
        JSON.stringify(colleges.map((c) => c.id))
      );
    }
  }, [colleges]);

  // ---- Render helpers ----
  const sortIcon = params.sortOrder === "asc" ? <FaIcon icon="arrow-up" className="text-xs" /> : <FaIcon icon="arrow-down" className="text-xs" />;

  return (
    <div className="min-h-screen bg-background">
      {/* ================================================================ */}
      {/* HEADER                                                            */}
      {/* ================================================================ */}
      <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <FaIcon icon="graduation-cap" style="duotone" className="text-lg text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-primary">
              College Quest
            </span>
          </div>

          {/* Right side: favorites + auth */}
          <div className="flex items-center gap-3">
            {/* Favorites toggle */}
            {user && (
              <Button
                variant={showFavoritesOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className={cn(
                  "gap-1.5",
                  showFavoritesOnly &&
                    "bg-primary hover:bg-primary/90 text-white"
                )}
              >
                <FaIcon
                  icon="heart"
                  style={showFavoritesOnly ? "solid" : "regular"}
                  className="text-sm"
                />
                <span className="hidden sm:inline">Favorites</span>
                {favoriteIds.size > 0 && (
                  <Badge
                    variant="secondary"
                    className={cn(
                      "ml-0.5 h-5 min-w-5 justify-center px-1.5 text-[10px]",
                      showFavoritesOnly
                        ? "bg-white/20 text-white"
                        : "bg-amber-100 text-amber-800"
                    )}
                  >
                    {favoriteIds.size}
                  </Badge>
                )}
              </Button>
            )}

            {/* Copy for AI dropdown */}
            {user && favoriteIds.size > 0 && (
              <div ref={copyDropdownRef} className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCopyDropdownOpen((prev) => !prev)}
                  className="gap-1.5"
                >
                  {exportCopied ? (
                    <FaIcon icon="check" className="text-sm text-green-600" />
                  ) : (
                    <FaIcon icon="copy" style="regular" className="text-sm" />
                  )}
                  <span className="hidden sm:inline">
                    {exportCopied ? "Copied!" : "Copy"}
                  </span>
                  <FaIcon icon="chevron-down" className="text-[10px] opacity-60" />
                </Button>
                {copyDropdownOpen && (
                  <div className="absolute right-0 top-full z-50 mt-1 w-64 overflow-hidden rounded-lg border border-border bg-white shadow-lg">
                    <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Copy favorites for…
                    </div>
                    <button
                      onClick={() => copyForAI("chatgpt")}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-gray-50"
                    >
                      <FaIcon icon="openai" style="brands" className="text-base text-muted-foreground" />
                      Copy for ChatGPT
                    </button>
                    <button
                      onClick={() => copyForAI("gemini")}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-gray-50"
                    >
                      <FaIcon icon="google" style="brands" className="text-base text-muted-foreground" />
                      Copy for Google Gemini
                    </button>
                    <button
                      onClick={() => copyForAI("claude")}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-gray-50"
                    >
                      <FaIcon icon="message-bot" style="duotone" className="text-base text-muted-foreground" />
                      Copy for Claude
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Auth */}
            {user ? (
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-800">
                  {(user.displayName || user.email || "U").charAt(0).toUpperCase()}
                </div>
                <a
                  href="/auth/signout"
                  className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <FaIcon icon="right-from-bracket" style="duotone" className="text-sm" />
                  <span className="hidden sm:inline">Sign out</span>
                </a>
              </div>
            ) : (
              <a
                href="/login"
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
              >
                <FaIcon icon="right-to-bracket" style="duotone" className="text-sm" />
                Log in
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* ================================================================ */}
        {/* SEARCH BAR                                                       */}
        {/* ================================================================ */}
        <div className="relative mb-6 max-w-full sm:max-w-xl">
          <div className="relative flex items-stretch rounded-xl border border-border bg-white shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary">
            <span className="pointer-events-none flex items-center pl-3.5">
              <FaIcon icon="magnifying-glass" style="duotone" fixedWidth className="text-lg text-muted-foreground" />
            </span>
            <input
              ref={searchInputRef}
              type="text"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setAutocompleteOpen(true);
                setAutocompleteIndex(-1);
              }}
              onFocus={() => {
                if (searchInput.length >= 2) setAutocompleteOpen(true);
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search colleges, programs, or locations..."
              className="h-12 flex-1 bg-transparent px-2 text-base placeholder:text-muted-foreground focus:outline-none"
            />
            {searchInput && (
              <button
                onClick={() => {
                  setSearchInput("");
                  updateParams({ query: undefined });
                  setAutocompleteOpen(false);
                  searchInputRef.current?.focus();
                }}
                className="flex items-center px-2 text-muted-foreground transition-colors hover:text-foreground"
              >
                <FaIcon icon="xmark" className="text-sm" />
              </button>
            )}
            <Button
              onClick={() => {
                updateParams({ query: searchInput || undefined });
                setAutocompleteOpen(false);
              }}
              className="h-12 rounded-l-none rounded-r-xl bg-primary hover:bg-primary/90"
            >
              Search
            </Button>
          </div>

          {/* Autocomplete dropdown */}
          {autocompleteOpen && autocompleteResults.length > 0 && (
            <div
              ref={autocompleteRef}
              className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-border bg-white shadow-lg"
            >
              {autocompleteResults.map((item, i) => (
                <button
                  key={item.id}
                  onClick={() => handleAutocompleteSelect(item)}
                  onMouseEnter={() => setAutocompleteIndex(i)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors",
                    i === autocompleteIndex
                      ? "bg-amber-50 text-foreground"
                      : "text-foreground hover:bg-gray-50"
                  )}
                >
                  <FaIcon icon="graduation-cap" style="duotone" className="text-sm shrink-0 text-muted-foreground" />
                  <span>{item.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ================================================================ */}
        {/* FILTER ROW — always visible                                        */}
        {/* ================================================================ */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <FilterMultiSelect
            label="State"
            options={stateOptions}
            selected={
              params.states
                ? params.states.split(",").map((s) => s.trim())
                : []
            }
            onToggle={(v) => toggleMultiFilter("states", v)}
          />

          <FilterMultiSelect
            label="Region"
            options={regionOptions}
            selected={
              params.regions
                ? params.regions.split(",").map((s) => s.trim())
                : []
            }
            onToggle={(v) => toggleMultiFilter("regions", v)}
          />

          <FilterMultiSelect
            label="Size"
            options={SIZES}
            selected={
              params.sizes
                ? params.sizes.split(",").map((s) => s.trim())
                : []
            }
            onToggle={(v) => toggleMultiFilter("sizes", v)}
          />

          <FilterMultiSelect
            label="Acceptance Rate"
            options={acceptanceRangeOptions}
            selected={
              params.acceptanceRanges
                ? params.acceptanceRanges.split(",").map((s) => s.trim())
                : []
            }
            onToggle={(v) => toggleMultiFilter("acceptanceRanges", v)}
          />

          <FilterMultiSelect
            label="Program"
            options={programCategoryOptions}
            selected={
              params.programCategories
                ? params.programCategories
                    .split(",")
                    .map((s) => s.trim())
                : []
            }
            onToggle={(v) => toggleMultiFilter("programCategories", v)}
          />
        </div>

        {/* Active filters + clear row */}
        {activeFilters.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {activeFilters.map((f) => (
              <Badge
                key={f.key}
                variant="secondary"
                className="gap-1 bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 cursor-default"
              >
                {f.key}
                <button
                  onClick={() => removeFilter(f.paramKey, f.value)}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-amber-200"
                >
                  <FaIcon icon="xmark" className="text-[10px]" />
                </button>
              </Badge>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-muted-foreground hover:text-foreground h-7 px-2 text-xs"
            >
              Clear all
            </Button>

            {/* Saved filters */}
            {savedFilters.length > 0 && (
              <div className="ml-auto flex items-center gap-1">
                <FaIcon icon="bookmark" style="duotone" className="text-xs text-muted-foreground" />
                {savedFilters.map((sf) => (
                  <div key={sf.id} className="flex items-center">
                    <button
                      onClick={() => loadSavedFilter(sf)}
                      className="rounded-md px-2 py-1 text-xs text-primary hover:bg-primary/5 font-medium"
                    >
                      {sf.name}
                    </button>
                    <button
                      onClick={() => deleteSavedFilter(sf.id)}
                      className="rounded p-0.5 text-muted-foreground hover:text-destructive"
                    >
                      <FaIcon icon="xmark" className="text-[10px]" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Save filter button */}
            <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                >
                  <FaIcon icon="floppy-disk" style="duotone" className="text-sm" />
                  Save Filter
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save Current Filter</DialogTitle>
                  <DialogDescription>
                    Name this filter combination to quickly load it later.
                    You can save up to 5 filters.
                  </DialogDescription>
                </DialogHeader>
                <Input
                  value={saveFilterName}
                  onChange={(e) => setSaveFilterName(e.target.value)}
                  placeholder="e.g. Northeast Liberal Arts"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveCurrentFilter();
                  }}
                />
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setSaveDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={saveCurrentFilter}
                    disabled={!saveFilterName.trim()}
                    className="bg-primary hover:bg-primary/90"
                  >
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* ================================================================ */}
        {/* VIEW CONTROLS                                                     */}
        {/* ================================================================ */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <h1 className="text-2xl font-bold text-foreground">
              {collegesLoading
                ? "Loading..."
                : `${formatNumber(totalResults)} college${totalResults !== 1 ? "s" : ""} found`}
            </h1>
            {showFavoritesOnly && (
              <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
                Showing favorites
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Sort (hidden in table view — headers handle sorting) */}
            {viewMode !== "table" && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground hidden sm:inline">Sort:</span>
                <Select
                  value={params.sortBy || "name"}
                  onValueChange={(v) => updateParams({ sortBy: v })}
                >
                  <SelectTrigger className="h-8 w-[140px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() =>
                    updateParams({
                      sortOrder: params.sortOrder === "asc" ? "desc" : "asc",
                    })
                  }
                  title={`Sort ${params.sortOrder === "asc" ? "descending" : "ascending"}`}
                >
                  {sortIcon}
                </Button>
              </div>
            )}

            {/* View mode */}
            <div className="flex items-center rounded-lg border border-border bg-white p-0.5">
              {([
                { mode: "table" as ViewMode, faIcon: "table", label: "Table" },
                { mode: "grid" as ViewMode, faIcon: "grid-2", label: "Grid" },
                { mode: "list" as ViewMode, faIcon: "list", label: "List" },
                { mode: "map" as ViewMode, faIcon: "map-location-dot", label: "Map" },
              ] as const).map(({ mode, faIcon, label }) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  title={label}
                  className={cn(
                    "rounded-md p-1.5 transition-colors",
                    viewMode === mode
                      ? "bg-primary text-white"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <FaIcon icon={faIcon} style="duotone" className="text-sm" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ================================================================ */}
        {/* RESULTS                                                           */}
        {/* ================================================================ */}
        {collegesLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Loading colleges...</p>
            </div>
          </div>
        ) : collegesError ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FaIcon icon="graduation-cap" style="duotone" className="text-4xl text-destructive/40 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-1">
              Failed to load colleges
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Something went wrong. Please try again.
            </p>
            <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["colleges"] })}>
              Try again
            </Button>
          </div>
        ) : colleges.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FaIcon icon="graduation-cap" style="duotone" className="text-4xl text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-1">
              No colleges found
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Try adjusting your search or filters to find what you&apos;re looking for.
            </p>
            <Button variant="outline" onClick={clearAllFilters}>
              Clear all filters
            </Button>
          </div>
        ) : (
          <>
            {/* TABLE VIEW */}
            {viewMode === "table" && (
              <CollegeTable
                colleges={colleges}
                sortBy={params.sortBy || "name"}
                sortOrder={params.sortOrder || "asc"}
                onSort={(sb, so) => updateParams({ sortBy: sb, sortOrder: so })}
                favoriteIds={favoriteIds}
                onToggleFavorite={(id) => toggleFavoriteMutation.mutate(id)}
                user={user}
              />
            )}

            {/* GRID VIEW */}
            {viewMode === "grid" && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {colleges.map((college) => (
                  <Card
                    key={college.id}
                    className="group overflow-hidden transition-shadow hover:shadow-md"
                  >
                    {/* Image placeholder */}
                    <div className="relative h-36 bg-gradient-to-br from-primary/10 to-amber-50 flex items-center justify-center">
                      <FaIcon icon="graduation-cap" style="duotone" className="text-4xl text-primary/20" />
                      {college.jesuit && (
                        <Badge className="absolute top-2 left-2 bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100 text-[10px]">
                          Jesuit
                        </Badge>
                      )}
                      <CollegeActions
                        collegeId={college.id}
                        isFavorite={favoriteIds.has(college.id)}
                        onToggleFavorite={() => toggleFavoriteMutation.mutate(college.id)}
                        user={user}
                        variant="grid"
                      />
                    </div>
                    <CardContent className="p-4">
                      <a
                        href={`/college/${college.id}`}
                        className="mb-1 block text-base font-semibold text-primary hover:underline line-clamp-1"
                      >
                        {college.name}
                      </a>
                      <p className="mb-3 flex items-center gap-1 text-sm text-muted-foreground">
                        <FaIcon icon="location-dot" style="duotone" className="text-xs shrink-0" />
                        {college.city}, {college.state}
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-md bg-gray-50 px-2 py-1.5">
                          <span className="block text-muted-foreground">
                            Tuition
                          </span>
                          <span className="font-semibold text-foreground tabular-nums">
                            {formatCurrency(college.tuitionInState)}
                          </span>
                        </div>
                        <div className="rounded-md bg-gray-50 px-2 py-1.5">
                          <span className="block text-muted-foreground">
                            Acceptance
                          </span>
                          <span className="font-semibold text-foreground tabular-nums">
                            {formatPercent(college.acceptanceRate)}
                          </span>
                        </div>
                        <div className="rounded-md bg-gray-50 px-2 py-1.5">
                          <span className="block text-muted-foreground">
                            Enrollment
                          </span>
                          <span className="font-semibold text-foreground tabular-nums">
                            {formatNumber(college.enrollment)}
                          </span>
                        </div>
                        <div className="rounded-md bg-gray-50 px-2 py-1.5">
                          <span className="block text-muted-foreground">
                            Type
                          </span>
                          <span className="font-semibold text-foreground">
                            {college.type || "N/A"}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* LIST VIEW */}
            {viewMode === "list" && (
              <div className="flex flex-col gap-3">
                {colleges.map((college) => (
                  <Card
                    key={college.id}
                    className="transition-shadow hover:shadow-md"
                  >
                    <div className="flex flex-col sm:flex-row">
                      {/* Image placeholder */}
                      <div className="flex h-28 w-full sm:h-auto sm:w-48 shrink-0 items-center justify-center bg-gradient-to-br from-primary/10 to-amber-50 rounded-t-lg sm:rounded-l-lg sm:rounded-tr-none">
                        <FaIcon icon="graduation-cap" style="duotone" className="text-3xl text-primary/20" />
                      </div>
                      <div className="flex flex-1 items-start justify-between gap-4 p-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2 mb-1">
                            <a
                              href={`/college/${college.id}`}
                              className="text-base font-semibold text-primary hover:underline line-clamp-1"
                            >
                              {college.name}
                            </a>
                            {college.jesuit && (
                              <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100 text-[10px] shrink-0">
                                Jesuit
                              </Badge>
                            )}
                          </div>
                          <p className="mb-2 flex items-center gap-1 text-sm text-muted-foreground">
                            <FaIcon icon="location-dot" style="duotone" className="text-xs shrink-0" />
                            {college.city}, {college.state}
                            {college.type && (
                              <>
                                <span className="mx-1.5 text-border">|</span>
                                {college.type}
                              </>
                            )}
                            {college.size && (
                              <>
                                <span className="mx-1.5 text-border">|</span>
                                {college.size}
                              </>
                            )}
                          </p>
                          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <FaIcon icon="dollar-sign" style="duotone" className="text-xs" />
                              {formatCurrency(college.tuitionInState)}
                            </span>
                            <span className="flex items-center gap-1">
                              <FaIcon icon="percent" style="duotone" className="text-xs" />
                              {formatPercent(college.acceptanceRate)} acceptance
                            </span>
                            <span className="flex items-center gap-1">
                              <FaIcon icon="users" style="duotone" className="text-xs" />
                              {formatNumber(college.enrollment)} students
                            </span>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <CollegeActions
                            collegeId={college.id}
                            isFavorite={favoriteIds.has(college.id)}
                            onToggleFavorite={() => toggleFavoriteMutation.mutate(college.id)}
                            user={user}
                            variant="list"
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
                              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground hover:bg-gray-100"
                              title="Visit website"
                            >
                              <FaIcon icon="arrow-up-right-from-square" style="duotone" className="text-sm" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* ============================================================ */}
            {/* MAP VIEW                                                       */}
            {/* ============================================================ */}
            {viewMode === "map" && (
              <CollegeMapView colleges={colleges} isLoading={collegesLoading} />
            )}

            {/* ============================================================ */}
            {/* PAGINATION                                                     */}
            {/* ============================================================ */}
            {viewMode !== "map" && totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => updateParams({ page: currentPage - 1 })}
                  className="gap-1"
                >
                  <FaIcon icon="chevron-left" className="text-sm" />
                  <span className="hidden sm:inline">Previous</span>
                </Button>

                <div className="flex items-center gap-1">
                  {generatePageNumbers(currentPage, totalPages).map(
                    (page, idx) =>
                      page === "..." ? (
                        <span
                          key={`ellipsis-${idx}`}
                          className="px-2 text-sm text-muted-foreground"
                        >
                          ...
                        </span>
                      ) : (
                        <button
                          key={page}
                          onClick={() => updateParams({ page: page as number })}
                          className={cn(
                            "flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm font-medium transition-colors",
                            currentPage === page
                              ? "bg-primary text-white"
                              : "text-muted-foreground hover:bg-gray-100"
                          )}
                        >
                          {page}
                        </button>
                      )
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => updateParams({ page: currentPage + 1 })}
                  className="gap-1"
                >
                  <span className="hidden sm:inline">Next</span>
                  <FaIcon icon="chevron-right" className="text-sm" />
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FilterMultiSelect - scrollable multi-value filter dropdown
// ---------------------------------------------------------------------------

function FilterMultiSelect({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  icon?: React.ReactNode;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [filterText, setFilterText] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setFilterText("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

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

// ---------------------------------------------------------------------------
// Pagination page number generator
// ---------------------------------------------------------------------------

function generatePageNumbers(
  current: number,
  total: number
): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: (number | "...")[] = [];
  pages.push(1);
  if (current > 3) pages.push("...");
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}
