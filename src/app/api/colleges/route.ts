import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);

    const query = searchParams.get("query") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "12") || 12));
    const sortBy = searchParams.get("sortBy") || "name";
    const sortOrder = searchParams.get("sortOrder") || "asc";
    const states = searchParams.get("states");
    const regions = searchParams.get("regions");
    const types = searchParams.get("types");
    const sizes = searchParams.get("sizes");
    const favoriteIds = searchParams.get("favoriteIds");
    const acceptanceRateMin = searchParams.get("acceptanceRateMin");
    const acceptanceRateMax = searchParams.get("acceptanceRateMax");
    const acceptanceRanges = searchParams.get("acceptanceRanges");
    const tuitionMin = searchParams.get("tuitionMin");
    const tuitionMax = searchParams.get("tuitionMax");
    const enrollmentMin = searchParams.get("enrollmentMin");
    const enrollmentMax = searchParams.get("enrollmentMax");
    const jesuitOnly = searchParams.get("jesuitOnly");
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

    let dbQuery = supabase
      .from("colleges")
      .select("*", { count: "exact" });

    // Text search
    if (query) {
      const q = `%${query}%`;
      dbQuery = dbQuery.or(
        `name.ilike.${q},city.ilike.${q},state.ilike.${q},region.ilike.${q},type.ilike.${q},description.ilike.${q},website.ilike.${q}`
      );
    }

    // Filters
    if (states) {
      dbQuery = dbQuery.in("state", states.split(",").map((s) => s.trim()));
    }
    if (regions) {
      dbQuery = dbQuery.in("region", regions.split(",").map((r) => r.trim()));
    }
    if (types) {
      dbQuery = dbQuery.in("type", types.split(",").map((t) => t.trim()));
    }
    if (sizes) {
      dbQuery = dbQuery.in("size", sizes.split(",").map((s) => s.trim()));
    }
    if (jesuitOnly === "true") {
      dbQuery = dbQuery.eq("jesuit", true);
    }
    if (programCollegeIds) {
      dbQuery = dbQuery.in("id", programCollegeIds);
    }
    if (favoriteIds) {
      dbQuery = dbQuery.in("id", favoriteIds.split(",").map((id) => id.trim()));
    }

    // Acceptance rate ranges
    if (acceptanceRanges) {
      const ranges = acceptanceRanges.split(",").map((r) => r.trim());
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
      if (orConditions.length > 0) {
        dbQuery = dbQuery.or(orConditions.join(","));
      }
    } else {
      if (acceptanceRateMin) {
        dbQuery = dbQuery.gte("acceptance_rate", parseFloat(acceptanceRateMin));
      }
      if (acceptanceRateMax) {
        dbQuery = dbQuery.lte("acceptance_rate", parseFloat(acceptanceRateMax));
      }
    }

    if (tuitionMin) {
      dbQuery = dbQuery.gte("tuition_in_state", parseInt(tuitionMin));
    }
    if (tuitionMax) {
      dbQuery = dbQuery.lte("tuition_in_state", parseInt(tuitionMax));
    }
    if (enrollmentMin) {
      dbQuery = dbQuery.gte("enrollment", parseInt(enrollmentMin));
    }
    if (enrollmentMax) {
      dbQuery = dbQuery.lte("enrollment", parseInt(enrollmentMax));
    }

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

    if (sortBy === "relevance" && favoriteIds) {
      // For relevance sorting, fetch all then sort client-side
      const { data, count, error } = await dbQuery;
      if (error) throw error;

      const favIds = new Set(favoriteIds.split(","));
      const sorted = (data || []).sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
        const aFav = favIds.has(a.id as string) ? 1 : 0;
        const bFav = favIds.has(b.id as string) ? 1 : 0;
        return bFav - aFav;
      });

      const start = (page - 1) * limit;
      return NextResponse.json({
        colleges: sorted.slice(start, start + limit),
        total: count || 0,
      });
    }

    dbQuery = dbQuery.order(sortColumn, { ascending: sortOrder === "asc" });

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    dbQuery = dbQuery.range(from, to);

    const { data, count, error } = await dbQuery;
    if (error) throw error;

    return NextResponse.json({
      colleges: data || [],
      total: count || 0,
    });
  } catch (error) {
    console.error("Error fetching colleges:", error);
    return NextResponse.json(
      { error: "Failed to fetch colleges" },
      { status: 500 }
    );
  }
}
