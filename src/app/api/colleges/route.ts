import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sanitizeFilterValue } from "@/lib/utils";

// ── Parsed filter parameters ──────────────────────────────────────────────────
interface FilterParams {
  query: string;
  states: string | null;
  regions: string | null;
  types: string | null;
  sizes: string | null;
  favoriteIds: string | null;
  acceptanceRateMin: string | null;
  acceptanceRateMax: string | null;
  acceptanceRanges: string | null;
  tuitionMin: string | null;
  tuitionMax: string | null;
  enrollmentMin: string | null;
  enrollmentMax: string | null;
  jesuitOnly: string | null;
  programCollegeIds: string[] | null;
}

// ── Apply all filters to a Supabase query builder ─────────────────────────────
function applyFilters<T extends Record<string, unknown>>(
  dbQuery: T,
  f: FilterParams,
): T {
  let q = dbQuery;

  // Text search — sanitize to prevent PostgREST filter injection
  if (f.query) {
    const safe = sanitizeFilterValue(f.query);
    if (safe) {
      const like = `%${safe}%`;
      q = q.or(
        `name.ilike.${like},city.ilike.${like},state.ilike.${like},region.ilike.${like},type.ilike.${like},description.ilike.${like},website.ilike.${like}`,
      ) as T;
    }
  }

  // Enum / set filters
  if (f.states) q = q.in("state", f.states.split(",").map((s) => s.trim())) as T;
  if (f.regions) q = q.in("region", f.regions.split(",").map((r) => r.trim())) as T;
  if (f.types) q = q.in("type", f.types.split(",").map((t) => t.trim())) as T;
  if (f.sizes) q = q.in("size", f.sizes.split(",").map((s) => s.trim())) as T;
  if (f.jesuitOnly === "true") q = q.eq("jesuit", true) as T;
  if (f.programCollegeIds) q = q.in("id", f.programCollegeIds) as T;
  if (f.favoriteIds) q = q.in("id", f.favoriteIds.split(",").map((id) => id.trim())) as T;

  // Acceptance rate
  if (f.acceptanceRanges) {
    const ranges = f.acceptanceRanges.split(",").map((r) => r.trim());
    const orConditions: string[] = [];
    for (const range of ranges) {
      if (range.includes("0-15")) {
        orConditions.push("and(acceptance_rate.gt.0,acceptance_rate.lte.15)");
      } else if (range.includes("15-30")) {
        orConditions.push("and(acceptance_rate.gte.15,acceptance_rate.lte.30)");
      } else if (range.includes("30-50")) {
        orConditions.push("and(acceptance_rate.gte.30,acceptance_rate.lte.50)");
      } else if (range.includes("50-75")) {
        orConditions.push("and(acceptance_rate.gte.50,acceptance_rate.lte.75)");
      } else if (range.includes("75")) {
        orConditions.push("acceptance_rate.gte.75");
      }
    }
    if (orConditions.length > 0) q = q.or(orConditions.join(",")) as T;
  } else {
    if (f.acceptanceRateMin) {
      const v = parseFloat(f.acceptanceRateMin);
      if (!isNaN(v)) q = q.gte("acceptance_rate", v) as T;
    }
    if (f.acceptanceRateMax) {
      const v = parseFloat(f.acceptanceRateMax);
      if (!isNaN(v)) q = q.lte("acceptance_rate", v) as T;
    }
  }

  // Tuition
  if (f.tuitionMin) {
    const v = parseInt(f.tuitionMin);
    if (!isNaN(v)) q = q.gte("tuition_in_state", v) as T;
  }
  if (f.tuitionMax) {
    const v = parseInt(f.tuitionMax);
    if (!isNaN(v)) q = q.lte("tuition_in_state", v) as T;
  }

  // Enrollment
  if (f.enrollmentMin) {
    const v = parseInt(f.enrollmentMin);
    if (!isNaN(v)) q = q.gte("enrollment", v) as T;
  }
  if (f.enrollmentMax) {
    const v = parseInt(f.enrollmentMax);
    if (!isNaN(v)) q = q.lte("enrollment", v) as T;
  }

  return q;
}

// ── Helper: attach cache headers to a JSON response ───────────────────────────
function cachedJson(data: unknown, maxAge = 60) {
  const response = NextResponse.json(data);
  response.headers.set("Cache-Control", `public, s-maxage=${maxAge}, stale-while-revalidate=300`);
  return response;
}

// ── GET handler ───────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);

    const query = searchParams.get("query") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
    const limit = Math.min(5000, Math.max(1, parseInt(searchParams.get("limit") || "48") || 48));
    const sortBy = searchParams.get("sortBy") || "name";
    const sortOrder = searchParams.get("sortOrder") || "asc";
    const favoriteIds = searchParams.get("favoriteIds");
    const programCategories = searchParams.get("programCategories");

    // If filtering by program categories, get matching college IDs first
    let programCollegeIds: string[] | null = null;
    if (programCategories) {
      const categories = programCategories.split(",").map((c) => c.trim());
      const { data: schools } = await supabase
        .from("schools")
        .select("college_id")
        .in("category", categories);
      if (schools) {
        programCollegeIds = [
          ...new Set(schools.map((s: { college_id: string }) => s.college_id)),
        ];
      }
    }

    // Shared filter params — parsed once, used for every query
    const filters: FilterParams = {
      query,
      states: searchParams.get("states"),
      regions: searchParams.get("regions"),
      types: searchParams.get("types"),
      sizes: searchParams.get("sizes"),
      favoriteIds,
      acceptanceRateMin: searchParams.get("acceptanceRateMin"),
      acceptanceRateMax: searchParams.get("acceptanceRateMax"),
      acceptanceRanges: searchParams.get("acceptanceRanges"),
      tuitionMin: searchParams.get("tuitionMin"),
      tuitionMax: searchParams.get("tuitionMax"),
      enrollmentMin: searchParams.get("enrollmentMin"),
      enrollmentMax: searchParams.get("enrollmentMax"),
      jesuitOnly: searchParams.get("jesuitOnly"),
      programCollegeIds,
    };

    // Sorting
    const sortColumn = {
      name: "name",
      tuition: "tuition_in_state",
      enrollment: "enrollment",
      acceptance: "acceptance_rate",
      location: "state",
      region: "region",
      type: "type",
      size: "size",
      netCost: "net_cost",
    }[sortBy] || "name";

    // ── Build main query ──────────────────────────────────────────────────
    let dbQuery = applyFilters(
      supabase.from("colleges").select("*", { count: "exact" }),
      filters,
    );

    // Relevance sort: fetch all then sort client-side
    if (sortBy === "relevance" && favoriteIds) {
      const { data, count, error } = await dbQuery;
      if (error) throw error;

      const favIds = new Set(favoriteIds.split(","));
      const sorted = (data || []).sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
        const aFav = favIds.has(a.id as string) ? 1 : 0;
        const bFav = favIds.has(b.id as string) ? 1 : 0;
        return bFav - aFav;
      });

      const start = (page - 1) * limit;
      return cachedJson({
        colleges: sorted.slice(start, start + limit),
        total: count || 0,
      });
    }

    dbQuery = dbQuery.order(sortColumn, { ascending: sortOrder === "asc" });

    // ── Pagination ────────────────────────────────────────────────────────
    // Supabase caps at 1000 rows per request, so for large limits
    // (e.g. map view requesting all results) we paginate internally.
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    if (limit <= 1000) {
      dbQuery = dbQuery.range(from, to);
      const { data, count, error } = await dbQuery;
      if (error) throw error;
      return cachedJson({
        colleges: data || [],
        total: count || 0,
      });
    }

    // Large request: paginate in batches of 1000
    const allData: unknown[] = [];
    let totalCount = 0;
    let offset = from;
    const end = from + limit;

    while (offset < end) {
      const batchEnd = Math.min(offset + 999, end - 1);
      let bq = applyFilters(
        supabase.from("colleges").select("*", { count: offset === from ? "exact" : undefined }),
        filters,
      );
      bq = bq.order(sortColumn, { ascending: sortOrder === "asc" });
      bq = bq.range(offset, batchEnd);

      const { data, count, error } = await bq;
      if (error) throw error;
      if (offset === from && count != null) totalCount = count;
      if (!data || data.length === 0) break;
      allData.push(...data);
      if (data.length < (batchEnd - offset + 1)) break;
      offset = batchEnd + 1;
    }

    return cachedJson({
      colleges: allData,
      total: totalCount,
    });
  } catch (error) {
    console.error("Error fetching colleges:", error);
    return NextResponse.json(
      { error: "Failed to fetch colleges" },
      { status: 500 },
    );
  }
}
