import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { v4 as uuidv4 } from "uuid";

export async function GET(request: NextRequest) {
  const authError = verifyAdmin(request);
  if (authError) return authError;

  try {
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);

    const query = searchParams.get("query") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const sortBy = searchParams.get("sortBy") || "name";
    const sortOrder = searchParams.get("sortOrder") || "asc";

    let dbQuery = supabase.from("colleges").select("*", { count: "exact" });

    if (query) {
      dbQuery = dbQuery.or(
        `name.ilike.%${query}%,city.ilike.%${query}%,state.ilike.%${query}%`
      );
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

    return NextResponse.json({ colleges: data || [], total: count || 0 });
  } catch (error) {
    console.error("Error fetching admin colleges:", error);
    return NextResponse.json(
      { error: "Failed to fetch colleges" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authError = verifyAdmin(request);
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

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error creating college:", error);
    return NextResponse.json(
      { error: "Failed to create college" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const authError = verifyAdmin(request);
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
