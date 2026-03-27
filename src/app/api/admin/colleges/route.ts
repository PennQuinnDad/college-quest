import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { sanitizeFilterValue } from "@/lib/utils";
import { mapCollegeRow } from "@/lib/map-college";
import { v4 as uuidv4 } from "uuid";

export async function GET(request: NextRequest) {
  const authError = await verifyAdmin();
  if (authError) return authError;

  try {
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);

    const query = searchParams.get("query") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
    const limit = Math.min(500, Math.max(1, parseInt(searchParams.get("limit") || "20") || 20));
    const sortBy = searchParams.get("sortBy") || "name";
    const sortOrder = searchParams.get("sortOrder") || "asc";

    // Filter params
    const states = searchParams.get("states");
    const regions = searchParams.get("regions");
    const types = searchParams.get("types");
    const sizes = searchParams.get("sizes");
    const acceptanceRanges = searchParams.get("acceptanceRanges");
    const programCategories = searchParams.get("programCategories");

    // If filtering by program categories, find matching college IDs
    let programCollegeIds: string[] | null = null;
    if (programCategories) {
      const categories = programCategories.split(",").map((c) => c.trim());
      const { data: schools } = await supabase
        .from("schools")
        .select("college_id")
        .in("category", categories);
      if (schools) {
        programCollegeIds = [...new Set(schools.map((s) => s.college_id))];
      }
    }

    let dbQuery = supabase.from("colleges").select("*", { count: "exact" });

    if (query) {
      const safe = sanitizeFilterValue(query);
      if (safe) {
        dbQuery = dbQuery.or(
          `name.ilike.%${safe}%,city.ilike.%${safe}%,state.ilike.%${safe}%`
        );
      }
    }

    // Apply filters
    if (states) dbQuery = dbQuery.in("state", states.split(",").map((s) => s.trim()));
    if (regions) dbQuery = dbQuery.in("region", regions.split(",").map((r) => r.trim()));
    if (types) dbQuery = dbQuery.in("type", types.split(",").map((t) => t.trim()));
    if (sizes) dbQuery = dbQuery.in("size", sizes.split(",").map((s) => s.trim()));
    if (programCollegeIds && programCollegeIds.length > 0) {
      dbQuery = dbQuery.in("id", programCollegeIds);
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
      if (orConditions.length > 0) dbQuery = dbQuery.or(orConditions.join(","));
    }

    const sortColumn =
      {
        name: "name",
        tuition: "tuition_in_state",
        enrollment: "enrollment",
        acceptance: "acceptance_rate",
        location: "state",
      }[sortBy] || "name";

    dbQuery = dbQuery.order(sortColumn, { ascending: sortOrder === "asc" });

    const from = (page - 1) * limit;
    dbQuery = dbQuery.range(from, from + limit - 1);

    const { data, count, error } = await dbQuery;
    if (error) throw error;

    return NextResponse.json({ colleges: (data || []).map(mapCollegeRow), total: count || 0 });
  } catch (error) {
    console.error("Error fetching admin colleges:", error);
    return NextResponse.json(
      { error: "Failed to fetch colleges" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authError = await verifyAdmin();
  if (authError) return authError;

  try {
    const supabase = createServiceClient();
    const body = await request.json();

    if (!body.name || !body.city || !body.state) {
      return NextResponse.json(
        { error: "name, city, and state are required" },
        { status: 400 }
      );
    }

    const college = {
      id: body.id || uuidv4(),
      name: body.name,
      city: body.city,
      state: body.state,
      zip_code: body.zipCode ?? null,
      website: body.website ?? null,
      region: body.region ?? null,
      category: body.category ?? null,
      type: body.type ?? null,
      size: body.size ?? null,
      enrollment: body.enrollment ?? null,
      tuition_in_state: body.tuitionInState ?? null,
      tuition_out_of_state: body.tuitionOutOfState ?? null,
      net_cost: body.netCost ?? null,
      net_pricing_guidance: body.netPricingGuidance ?? null,
      acceptance_rate: body.acceptanceRate ?? null,
      sat_math: body.satMath ?? null,
      sat_reading: body.satReading ?? null,
      act_composite: body.actComposite ?? null,
      graduation_rate: body.graduationRate ?? null,
      programs: body.programs ?? null,
      description: body.description ?? null,
      image_url: body.imageUrl ?? null,
      jesuit: body.jesuit ?? false,
      scorecard_id: body.scorecardId ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("colleges")
      .insert(college)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(mapCollegeRow(data as Record<string, unknown>), { status: 201 });
  } catch (error) {
    console.error("Error creating college:", error);
    return NextResponse.json(
      { error: "Failed to create college" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const authError = await verifyAdmin();
  if (authError) return authError;

  try {
    const supabase = createServiceClient();
    const { ids } = await request.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "ids array is required" },
        { status: 400 }
      );
    }

    if (ids.length > 100) {
      return NextResponse.json(
        { error: "Cannot delete more than 100 colleges at once" },
        { status: 400 }
      );
    }

    const { error, count } = await supabase
      .from("colleges")
      .delete({ count: "exact" })
      .in("id", ids);

    if (error) throw error;

    return NextResponse.json({
      message: `${count} college(s) deleted successfully`,
      deleted: count,
    });
  } catch (error) {
    console.error("Error deleting colleges:", error);
    return NextResponse.json(
      { error: "Failed to delete colleges" },
      { status: 500 }
    );
  }
}
