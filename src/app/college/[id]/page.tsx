"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FaIcon } from "@/components/ui/fa-icon";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "@/components/ui/dialog";
import { CollegeActions } from "@/components/college-actions";
import { toast } from "@/components/ui/toaster";
import { cn, formatCurrency, formatPercent, formatNumber } from "@/lib/utils";
import type { College, School } from "@/lib/types";

const CollegeMap = dynamic(() => import("@/components/college-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[280px] items-center justify-center rounded-lg bg-gray-100">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
    </div>
  ),
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REGIONS = [
  "Northeast", "Southeast", "Midwest", "Southwest", "West",
  "Mid-Atlantic", "New England", "Pacific", "Mountain", "South",
];
const COLLEGE_TYPES = ["Public", "Private", "Community College"];
const COLLEGE_SIZES = ["Small", "Medium", "Large"];

interface CollegeFormData {
  name: string;
  city: string;
  state: string;
  region: string;
  website: string;
  type: string;
  size: string;
  tuitionInState: string;
  tuitionOutOfState: string;
  acceptanceRate: string;
  enrollment: string;
  description: string;
}

const EMPTY_FORM: CollegeFormData = {
  name: "",
  city: "",
  state: "",
  region: "",
  website: "",
  type: "",
  size: "",
  tuitionInState: "",
  tuitionOutOfState: "",
  acceptanceRate: "",
  enrollment: "",
  description: "",
};

// Category color palette for program badges
const CATEGORY_COLORS: Record<string, string> = {
  "Business": "bg-blue-100 text-blue-800 border-blue-200",
  "Engineering": "bg-orange-100 text-orange-800 border-orange-200",
  "Arts & Humanities": "bg-purple-100 text-purple-800 border-purple-200",
  "Sciences": "bg-green-100 text-green-800 border-green-200",
  "Health": "bg-red-100 text-red-800 border-red-200",
  "Education": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "Social Sciences": "bg-pink-100 text-pink-800 border-pink-200",
  "Technology": "bg-cyan-100 text-cyan-800 border-cyan-200",
  "Law": "bg-indigo-100 text-indigo-800 border-indigo-200",
};

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || "bg-gray-100 text-gray-800 border-gray-200";
}

// ---------------------------------------------------------------------------
// mapCollege — API returns snake_case, we use camelCase
// ---------------------------------------------------------------------------

function mapCollege(raw: Record<string, unknown>): College {
  return {
    id: raw.id as string,
    name: raw.name as string,
    city: raw.city as string,
    state: raw.state as string,
    zipCode: (raw.zip_code ?? null) as string | null,
    website: (raw.website ?? null) as string | null,
    region: (raw.region ?? null) as string | null,
    category: (raw.category ?? null) as string | null,
    type: (raw.type ?? null) as string | null,
    size: (raw.size ?? null) as string | null,
    enrollment: (raw.enrollment ?? null) as number | null,
    tuitionInState: (raw.tuition_in_state ?? null) as number | null,
    tuitionOutOfState: (raw.tuition_out_of_state ?? null) as number | null,
    netCost: (raw.net_cost ?? null) as number | null,
    netPricingGuidance: (raw.net_pricing_guidance ?? null) as string | null,
    acceptanceRate: (raw.acceptance_rate ?? null) as number | null,
    satMath: (raw.sat_math ?? null) as number | null,
    satReading: (raw.sat_reading ?? null) as number | null,
    actComposite: (raw.act_composite ?? null) as number | null,
    graduationRate: (raw.graduation_rate ?? null) as number | null,
    programs: (raw.programs ?? null) as string[] | null,
    description: (raw.description ?? null) as string | null,
    imageUrl: (raw.image_url ?? null) as string | null,
    jesuit: (raw.jesuit ?? false) as boolean,
    scorecardId: (raw.scorecard_id ?? null) as string | null,
    latitude: (raw.latitude ?? null) as number | null,
    longitude: (raw.longitude ?? null) as number | null,
    createdAt: raw.created_at as string,
    updatedAt: raw.updated_at as string,
  };
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function CollegeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  // ---- Search context from sessionStorage ----
  const [resultIds, setResultIds] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("cq-search-results");
      if (stored) {
        const ids: string[] = JSON.parse(stored);
        setResultIds(ids);
        const idx = ids.indexOf(id);
        setCurrentIndex(idx);
      }
    } catch {
      // ignore
    }
  }, [id]);

  const totalResults = resultIds.length;
  const hasSearchContext = currentIndex >= 0 && totalResults > 0;
  const prevId = hasSearchContext && currentIndex > 0 ? resultIds[currentIndex - 1] : null;
  const nextId = hasSearchContext && currentIndex < totalResults - 1 ? resultIds[currentIndex + 1] : null;

  // ---- Edit modal state ----
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<CollegeFormData>(EMPTY_FORM);

  // ---- Data fetching ----

  const {
    data: college,
    isLoading: collegeLoading,
    error: collegeError,
  } = useQuery<College>({
    queryKey: ["college", id],
    queryFn: async () => {
      const res = await fetch(`/api/colleges/${id}`);
      if (!res.ok) throw new Error("Failed to fetch college");
      const raw = await res.json();
      return mapCollege(raw);
    },
  });

  const { data: user } = useQuery<{ id: string; email: string; role: string } | null>({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await fetch("/api/me");
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
  });

  const { data: favoriteData } = useQuery<{ isFavorite: boolean }>({
    queryKey: ["favorite", id],
    queryFn: async () => {
      const res = await fetch(`/api/favorites/${id}`);
      if (!res.ok) {
        if (res.status === 401) return { isFavorite: false };
        throw new Error("Failed to check favorite status");
      }
      return res.json();
    },
  });

  const isFavorite = favoriteData?.isFavorite ?? false;

  // Fetch schools/programs for this college
  const { data: schools = [] } = useQuery<School[]>({
    queryKey: ["schools", id],
    queryFn: async () => {
      const res = await fetch(`/api/schools/programs?collegeIds=${id}`);
      if (!res.ok) return [];
      const raw: Record<string, unknown>[] = await res.json();
      return raw.map((s) => ({
        id: s.id as string,
        name: s.name as string,
        collegeId: (s.college_id as string) || "",
        collegeName: (s.college_name ?? null) as string | null,
        collegeCity: (s.college_city ?? null) as string | null,
        collegeState: (s.college_state ?? null) as string | null,
        category: (s.category ?? null) as string | null,
        cipCode: (s.cip_code ?? null) as string | null,
        website: (s.website ?? null) as string | null,
        description: (s.description ?? null) as string | null,
        source: (s.source as "manual" | "enriched") || "manual",
        createdAt: s.created_at as string,
        updatedAt: s.updated_at as string,
      }));
    },
    enabled: !!college,
  });

  // Group schools by category
  const schoolsByCategory = useMemo(() => {
    const grouped: Record<string, School[]> = {};
    for (const s of schools) {
      const cat = s.category || "Other";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(s);
    }
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
  }, [schools]);

  // ---- Mutations ----

  const toggleFavorite = useMutation({
    mutationFn: async () => {
      if (isFavorite) {
        const res = await fetch(`/api/favorites/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to remove favorite");
      } else {
        const res = await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ collegeId: id }),
        });
        if (!res.ok) throw new Error("Failed to add favorite");
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["favorite", id] });
      const previous = queryClient.getQueryData<{ isFavorite: boolean }>(["favorite", id]);
      queryClient.setQueryData(["favorite", id], { isFavorite: !isFavorite });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["favorite", id], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["favorite", id] });
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: CollegeFormData) => {
      const body = {
        name: data.name,
        city: data.city || null,
        state: data.state || null,
        region: data.region || null,
        website: data.website || null,
        type: data.type || null,
        size: data.size || null,
        tuitionInState: data.tuitionInState ? Number(data.tuitionInState) : null,
        tuitionOutOfState: data.tuitionOutOfState ? Number(data.tuitionOutOfState) : null,
        acceptanceRate: data.acceptanceRate ? Number(data.acceptanceRate) : null,
        enrollment: data.enrollment ? Number(data.enrollment) : null,
        description: data.description || null,
      };
      const res = await fetch(`/api/colleges/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to save college");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["college", id] });
      setEditOpen(false);
      toast({ title: "College updated" });
    },
    onError: () => {
      toast({ title: "Error saving college", variant: "destructive" });
    },
  });

  const handleToggleFavorite = useCallback(() => {
    toggleFavorite.mutate();
  }, [toggleFavorite]);

  function openEdit() {
    if (!college) return;
    setForm({
      name: college.name || "",
      city: college.city || "",
      state: college.state || "",
      region: college.region || "",
      website: college.website || "",
      type: college.type || "",
      size: college.size || "",
      tuitionInState: college.tuitionInState != null ? String(college.tuitionInState) : "",
      tuitionOutOfState: college.tuitionOutOfState != null ? String(college.tuitionOutOfState) : "",
      acceptanceRate: college.acceptanceRate != null ? String(college.acceptanceRate) : "",
      enrollment: college.enrollment != null ? String(college.enrollment) : "",
      description: college.description || "",
    });
    setEditOpen(true);
  }

  function handleSave() {
    if (!form.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    saveMutation.mutate(form);
  }

  function updateForm(key: keyof CollegeFormData, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // ---- Loading state ----

  if (collegeLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <FaIcon icon="spinner" style="duotone" className="text-2xl fa-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading college details...</p>
        </div>
      </div>
    );
  }

  if (collegeError || !college) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <FaIcon icon="graduation-cap" style="duotone" className="text-4xl text-muted-foreground" />
        <h2 className="text-xl font-semibold text-foreground">College not found</h2>
        <p className="text-sm text-muted-foreground">
          The college you are looking for does not exist or could not be loaded.
        </p>
        <Button asChild variant="outline">
          <Link href="/">
            <FaIcon icon="arrow-left" style="solid" className="text-sm" />
            Back to Home
          </Link>
        </Button>
      </div>
    );
  }

  // ---- Helpers ----

  const websiteUrl = college.website
    ? college.website.startsWith("http")
      ? college.website
      : `https://${college.website}`
    : null;

  // ---- Render ----

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        {/* ================================================================ */}
        {/* TOP NAV BAR                                                       */}
        {/* ================================================================ */}
        <div className="mb-6 flex items-center justify-between">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <Link href="/">
              <FaIcon icon="arrow-left" style="solid" className="text-sm" />
              Back to Search
            </Link>
          </Button>

          {hasSearchContext && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>
                {currentIndex + 1} of {totalResults}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={!prevId}
                  onClick={() => prevId && router.push(`/college/${prevId}`)}
                >
                  <FaIcon icon="chevron-left" className="text-xs" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={!nextId}
                  onClick={() => nextId && router.push(`/college/${nextId}`)}
                >
                  <FaIcon icon="chevron-right" className="text-xs" />
                </Button>
              </div>
              <span className="hidden sm:inline">Navigate</span>
            </div>
          )}
        </div>

        {/* ================================================================ */}
        {/* COLLEGE NAME + LOCATION                                           */}
        {/* ================================================================ */}
        <div className="mb-4">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {college.name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {(college.city || college.state) && (
              <span className="inline-flex items-center gap-1.5">
                <FaIcon icon="location-dot" style="duotone" className="text-sm text-primary" />
                {[college.city, college.state].filter(Boolean).join(", ")}
              </span>
            )}
            {websiteUrl && (
              <a
                href={websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-primary underline-offset-4 hover:underline"
              >
                <FaIcon icon="arrow-up-right-from-square" style="duotone" className="text-sm" />
                Visit Website
              </a>
            )}
            {college.type && (
              <Badge variant="secondary" className="gap-1">
                <FaIcon icon="building" style="duotone" className="text-[10px]" />
                {college.type}
              </Badge>
            )}
            {college.size && (
              <Badge variant="secondary" className="gap-1">
                <FaIcon icon="users" style="duotone" className="text-[10px]" />
                {college.size}
              </Badge>
            )}
            {college.jesuit && (
              <Badge className="gap-1 border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-100">
                <FaIcon icon="graduation-cap" style="duotone" className="text-[10px]" />
                Jesuit
              </Badge>
            )}
          </div>
        </div>

        {/* ================================================================ */}
        {/* ACTION BUTTONS                                                    */}
        {/* ================================================================ */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link href="/">
              <FaIcon icon="magnifying-glass" style="duotone" className="text-sm" />
              Continue Searching
            </Link>
          </Button>

          {user && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleFavorite}
                disabled={toggleFavorite.isPending}
                className={cn(
                  "gap-1.5 transition-colors",
                  isFavorite &&
                    "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800"
                )}
              >
                <FaIcon
                  icon="heart"
                  style={isFavorite ? "solid" : "regular"}
                  className={cn(
                    "text-sm",
                    isFavorite ? "text-amber-500" : "text-muted-foreground"
                  )}
                />
                {isFavorite ? "Favorited" : "Favorite"}
              </Button>
              <CollegeActions
                collegeId={id}
                isFavorite={isFavorite}
                onToggleFavorite={handleToggleFavorite}
                user={user}
                variant="detail"
              />
            </>
          )}

          {user && (
            <Button variant="outline" size="sm" onClick={openEdit} className="gap-1.5">
              <FaIcon icon="pen" style="duotone" className="text-sm" />
              Edit
            </Button>
          )}
        </div>

        {/* ================================================================ */}
        {/* HERO STAT CARDS — 4 across                                        */}
        {/* ================================================================ */}
        <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <HeroStat
            icon={<FaIcon icon="users" style="duotone" className="text-lg" />}
            label="Students"
            value={formatNumber(college.enrollment)}
          />
          <HeroStat
            icon={<FaIcon icon="dollar-sign" style="duotone" className="text-lg" />}
            label="In-State Tuition"
            value={formatCurrency(college.tuitionInState)}
          />
          <HeroStat
            icon={<FaIcon icon="chart-line" style="duotone" className="text-lg" />}
            label="Acceptance Rate"
            value={formatPercent(college.acceptanceRate)}
          />
          <HeroStat
            icon={<FaIcon icon="award" style="duotone" className="text-lg" />}
            label="Graduation Rate"
            value={formatPercent(college.graduationRate)}
          />
        </div>

        {/* ================================================================ */}
        {/* TWO-COLUMN LAYOUT                                                 */}
        {/* ================================================================ */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* LEFT COLUMN */}
          <div className="flex flex-col gap-6">
            {/* About */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FaIcon icon="circle-info" style="duotone" className="text-sm text-primary" />
                  About {college.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {college.description ? (
                  <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                    {college.description}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    No description available.
                  </p>
                )}
                {(college.type || college.size || college.region) && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {college.type && (
                      <Badge variant="secondary" className="gap-1">
                        <FaIcon icon="building" style="duotone" className="text-[10px]" />
                        {college.type}
                      </Badge>
                    )}
                    {college.size && (
                      <Badge variant="secondary" className="gap-1">
                        <FaIcon icon="users" style="duotone" className="text-[10px]" />
                        {college.size}
                      </Badge>
                    )}
                    {college.region && (
                      <Badge variant="outline" className="gap-1">
                        <FaIcon icon="location-dot" style="duotone" className="text-[10px]" />
                        {college.region}
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Schools & Programs */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FaIcon icon="book-open" style="duotone" className="text-sm text-primary" />
                  Schools &amp; Programs
                </CardTitle>
              </CardHeader>
              <CardContent>
                {schoolsByCategory.length > 0 ? (
                  <div className="space-y-4">
                    {schoolsByCategory.map(([category, programs]) => (
                      <div key={category}>
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {category}
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {programs.map((p) => (
                            <Badge
                              key={p.id}
                              variant="outline"
                              className={cn("text-xs", getCategoryColor(category))}
                            >
                              {p.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : college.programs && college.programs.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {college.programs.map((program) => (
                      <Badge key={program} variant="secondary" className="text-xs">
                        {program}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    No programs listed.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN */}
          <div className="flex flex-col gap-6">
            {/* Tuition & Costs */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FaIcon icon="dollar-sign" style="duotone" className="text-sm text-primary" />
                  Tuition &amp; Costs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3">
                  <StatRow label="In-State Tuition" value={formatCurrency(college.tuitionInState)} />
                  <StatRow label="Out-of-State Tuition" value={formatCurrency(college.tuitionOutOfState)} />
                  <StatRow label="Net Cost" value={formatCurrency(college.netCost)} />
                </dl>
              </CardContent>
            </Card>

            {/* Admissions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FaIcon icon="chart-line" style="duotone" className="text-sm text-primary" />
                  Admissions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3">
                  <StatRow label="Acceptance Rate" value={formatPercent(college.acceptanceRate)} />
                  <StatRow
                    label="SAT Math"
                    value={college.satMath != null ? formatNumber(college.satMath) : "N/A"}
                  />
                  <StatRow
                    label="SAT Reading"
                    value={college.satReading != null ? formatNumber(college.satReading) : "N/A"}
                  />
                  <StatRow
                    label="ACT Composite"
                    value={college.actComposite != null ? formatNumber(college.actComposite) : "N/A"}
                  />
                  <StatRow label="Graduation Rate" value={formatPercent(college.graduationRate)} />
                </dl>
              </CardContent>
            </Card>

            {/* Location Map */}
            {college.latitude != null && college.longitude != null && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FaIcon icon="map-location-dot" style="duotone" className="text-sm text-primary" />
                    Location
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CollegeMap
                    latitude={college.latitude}
                    longitude={college.longitude}
                    name={college.name}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* EDIT MODAL                                                        */}
      {/* ================================================================ */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit College</DialogTitle>
            <DialogDescription>
              Update the college information below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="c-name">Name *</Label>
                <Input
                  id="c-name"
                  value={form.name}
                  onChange={(e) => updateForm("name", e.target.value)}
                  placeholder="College name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-website">Website</Label>
                <Input
                  id="c-website"
                  value={form.website}
                  onChange={(e) => updateForm("website", e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="c-city">City</Label>
                <Input
                  id="c-city"
                  value={form.city}
                  onChange={(e) => updateForm("city", e.target.value)}
                  placeholder="City"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-state">State</Label>
                <Input
                  id="c-state"
                  value={form.state}
                  onChange={(e) => updateForm("state", e.target.value)}
                  placeholder="e.g. CA"
                />
              </div>
              <div className="space-y-2">
                <Label>Region</Label>
                <Select value={form.region || undefined} onValueChange={(v) => updateForm("region", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    {REGIONS.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.type || undefined} onValueChange={(v) => updateForm("type", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {COLLEGE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Size</Label>
                <Select value={form.size || undefined} onValueChange={(v) => updateForm("size", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    {COLLEGE_SIZES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-enrollment">Enrollment</Label>
                <Input
                  id="c-enrollment"
                  type="number"
                  value={form.enrollment}
                  onChange={(e) => updateForm("enrollment", e.target.value)}
                  placeholder="e.g. 15000"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="c-tuition-in">Tuition (In-State)</Label>
                <Input
                  id="c-tuition-in"
                  type="number"
                  value={form.tuitionInState}
                  onChange={(e) => updateForm("tuitionInState", e.target.value)}
                  placeholder="e.g. 12000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-tuition-out">Tuition (Out-of-State)</Label>
                <Input
                  id="c-tuition-out"
                  type="number"
                  value={form.tuitionOutOfState}
                  onChange={(e) => updateForm("tuitionOutOfState", e.target.value)}
                  placeholder="e.g. 35000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-acceptance">Acceptance Rate</Label>
                <Input
                  id="c-acceptance"
                  type="number"
                  step="0.1"
                  value={form.acceptanceRate}
                  onChange={(e) => updateForm("acceptanceRate", e.target.value)}
                  placeholder="e.g. 45.0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-desc">Description</Label>
              <textarea
                id="c-desc"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={form.description}
                onChange={(e) => updateForm("description", e.target.value)}
                placeholder="Brief description of the college"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-primary"
              onClick={handleSave}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending && (
                <FaIcon icon="spinner" style="solid" className="mr-2 text-sm fa-spin" />
              )}
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function HeroStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card className="border-border">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-lg font-semibold tracking-tight text-foreground">
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-semibold tabular-nums text-foreground">{value}</dd>
    </div>
  );
}
