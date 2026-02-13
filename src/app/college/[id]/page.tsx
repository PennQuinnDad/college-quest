"use client";

import { use, useCallback } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MapPin,
  ExternalLink,
  Heart,
  ArrowLeft,
  GraduationCap,
  Building,
  Users,
  DollarSign,
  TrendingUp,
  BookOpen,
  Target,
  Award,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn, formatCurrency, formatPercent, formatNumber } from "@/lib/utils";
import type { College } from "@/lib/types";

// The API returns snake_case keys from Supabase; map to our camelCase College type.
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
    createdAt: raw.created_at as string,
    updatedAt: raw.updated_at as string,
  };
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function StatCard({ icon, label, value }: StatCardProps) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-lg font-semibold tracking-tight text-foreground">
          {value}
        </p>
      </div>
    </div>
  );
}

export default function CollegeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const queryClient = useQueryClient();

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

  const { data: similarColleges, isLoading: similarLoading } = useQuery<
    College[]
  >({
    queryKey: ["college", id, "similar"],
    queryFn: async () => {
      const res = await fetch(`/api/colleges/${id}/similar?limit=6`);
      if (!res.ok) throw new Error("Failed to fetch similar colleges");
      const rawList: Record<string, unknown>[] = await res.json();
      return rawList.map(mapCollege);
    },
    enabled: !!college,
  });

  const { data: favoriteData } = useQuery<{ isFavorite: boolean }>({
    queryKey: ["favorite", id],
    queryFn: async () => {
      const res = await fetch(`/api/favorites/${id}`);
      if (!res.ok) {
        // 401 means user not logged in; treat as not favorited
        if (res.status === 401) return { isFavorite: false };
        throw new Error("Failed to check favorite status");
      }
      return res.json();
    },
  });

  const isFavorite = favoriteData?.isFavorite ?? false;

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
      const previous = queryClient.getQueryData<{ isFavorite: boolean }>([
        "favorite",
        id,
      ]);
      queryClient.setQueryData(["favorite", id], {
        isFavorite: !isFavorite,
      });
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

  const handleToggleFavorite = useCallback(() => {
    toggleFavorite.mutate();
  }, [toggleFavorite]);

  // ---- Loading state ----

  if (collegeLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading college details...</p>
        </div>
      </div>
    );
  }

  if (collegeError || !college) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <GraduationCap className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold text-foreground">
          College not found
        </h2>
        <p className="text-sm text-muted-foreground">
          The college you are looking for does not exist or could not be loaded.
        </p>
        <Button asChild variant="outline">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
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

  const locationParts = [college.city, college.state, college.zipCode]
    .filter(Boolean)
    .join(", ");

  // ---- Stats grid data ----

  const stats: StatCardProps[] = [
    {
      icon: <DollarSign className="h-4 w-4" />,
      label: "Tuition (In-State)",
      value: formatCurrency(college.tuitionInState),
    },
    {
      icon: <DollarSign className="h-4 w-4" />,
      label: "Tuition (Out-of-State)",
      value: formatCurrency(college.tuitionOutOfState),
    },
    {
      icon: <DollarSign className="h-4 w-4" />,
      label: "Net Cost",
      value: formatCurrency(college.netCost),
    },
    {
      icon: <Target className="h-4 w-4" />,
      label: "Acceptance Rate",
      value: formatPercent(college.acceptanceRate),
    },
    {
      icon: <Users className="h-4 w-4" />,
      label: "Enrollment",
      value: formatNumber(college.enrollment),
    },
    {
      icon: <BookOpen className="h-4 w-4" />,
      label: "SAT Math",
      value: college.satMath != null ? formatNumber(college.satMath) : "N/A",
    },
    {
      icon: <BookOpen className="h-4 w-4" />,
      label: "SAT Reading",
      value:
        college.satReading != null ? formatNumber(college.satReading) : "N/A",
    },
    {
      icon: <TrendingUp className="h-4 w-4" />,
      label: "ACT Composite",
      value:
        college.actComposite != null
          ? formatNumber(college.actComposite)
          : "N/A",
    },
    {
      icon: <Award className="h-4 w-4" />,
      label: "Graduation Rate",
      value: formatPercent(college.graduationRate),
    },
  ];

  // ---- Render ----

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Top navigation */}
        <div className="mb-6 flex items-center justify-between">
          <Button asChild variant="ghost" size="sm">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleFavorite}
            disabled={toggleFavorite.isPending}
            className={cn(
              "gap-2 transition-colors",
              isFavorite &&
                "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800"
            )}
          >
            <Heart
              className={cn(
                "h-4 w-4",
                isFavorite ? "fill-amber-500 text-amber-500" : "text-muted-foreground"
              )}
            />
            {isFavorite ? "Saved" : "Save"}
          </Button>
        </div>

        {/* Header section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {college.name}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            {locationParts && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-primary" />
                {locationParts}
              </span>
            )}

            {websiteUrl && (
              <a
                href={websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-primary underline-offset-4 hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                Visit Website
              </a>
            )}
          </div>

          {/* Badges */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {college.type && (
              <Badge variant="secondary" className="gap-1">
                <Building className="h-3 w-3" />
                {college.type}
              </Badge>
            )}
            {college.size && (
              <Badge variant="secondary" className="gap-1">
                <Users className="h-3 w-3" />
                {college.size}
              </Badge>
            )}
            {college.region && (
              <Badge variant="outline" className="gap-1">
                <MapPin className="h-3 w-3" />
                {college.region}
              </Badge>
            )}
            {college.jesuit && (
              <Badge className="gap-1 border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-100">
                <GraduationCap className="h-3 w-3" />
                Jesuit
              </Badge>
            )}
          </div>
        </div>

        <Separator className="mb-8" />

        {/* Stats grid */}
        <section className="mb-10">
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            Key Statistics
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stats.map((stat) => (
              <StatCard
                key={stat.label}
                icon={stat.icon}
                label={stat.label}
                value={stat.value}
              />
            ))}
          </div>
        </section>

        {/* Description */}
        {college.description && (
          <section className="mb-10">
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              About
            </h2>
            <Card>
              <CardContent className="pt-6">
                <p className="whitespace-pre-line leading-relaxed text-muted-foreground">
                  {college.description}
                </p>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Programs */}
        {college.programs && college.programs.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              Programs
            </h2>
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-2">
                  {college.programs.map((program) => (
                    <Badge
                      key={program}
                      variant="secondary"
                      className="text-xs"
                    >
                      {program}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        <Separator className="mb-8" />

        {/* Similar colleges */}
        <section className="mb-10">
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            Similar Colleges
          </h2>

          {similarLoading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading similar colleges...
            </div>
          ) : similarColleges && similarColleges.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {similarColleges.map((similar) => (
                <Link
                  key={similar.id}
                  href={`/college/${similar.id}`}
                  className="group"
                >
                  <Card className="h-full transition-shadow hover:shadow-md">
                    <CardHeader className="pb-3">
                      <CardTitle className="line-clamp-2 text-base font-semibold group-hover:text-primary">
                        {similar.name}
                      </CardTitle>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {similar.city}, {similar.state}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                        {similar.acceptanceRate != null && (
                          <div>
                            <span className="text-muted-foreground">
                              Acceptance:{" "}
                            </span>
                            <span className="font-medium">
                              {formatPercent(similar.acceptanceRate)}
                            </span>
                          </div>
                        )}
                        {similar.tuitionInState != null && (
                          <div>
                            <span className="text-muted-foreground">
                              Tuition:{" "}
                            </span>
                            <span className="font-medium">
                              {formatCurrency(similar.tuitionInState)}
                            </span>
                          </div>
                        )}
                        {similar.enrollment != null && (
                          <div>
                            <span className="text-muted-foreground">
                              Students:{" "}
                            </span>
                            <span className="font-medium">
                              {formatNumber(similar.enrollment)}
                            </span>
                          </div>
                        )}
                        {similar.graduationRate != null && (
                          <div>
                            <span className="text-muted-foreground">
                              Grad Rate:{" "}
                            </span>
                            <span className="font-medium">
                              {formatPercent(similar.graduationRate)}
                            </span>
                          </div>
                        )}
                      </div>
                      {similar.jesuit && (
                        <Badge className="mt-3 gap-1 border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-100 text-[10px]">
                          <GraduationCap className="h-2.5 w-2.5" />
                          Jesuit
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <p className="py-4 text-sm text-muted-foreground">
              No similar colleges found.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
