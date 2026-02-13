import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("colleges")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "College not found" },
          { status: 404 }
        );
      }
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching college:", error);
    return NextResponse.json(
      { error: "Failed to fetch college" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authenticated user
    const supabaseAuth = await createClient();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Map camelCase request body to snake_case for Supabase
    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.city !== undefined) updates.city = body.city;
    if (body.state !== undefined) updates.state = body.state;
    if (body.region !== undefined) updates.region = body.region;
    if (body.website !== undefined) updates.website = body.website;
    if (body.type !== undefined) updates.type = body.type;
    if (body.size !== undefined) updates.size = body.size;
    if (body.tuitionInState !== undefined) updates.tuition_in_state = body.tuitionInState;
    if (body.tuitionOutOfState !== undefined) updates.tuition_out_of_state = body.tuitionOutOfState;
    if (body.acceptanceRate !== undefined) updates.acceptance_rate = body.acceptanceRate;
    if (body.enrollment !== undefined) updates.enrollment = body.enrollment;
    if (body.description !== undefined) updates.description = body.description;

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("colleges")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating college:", error);
    return NextResponse.json(
      { error: "Failed to update college" },
      { status: 500 }
    );
  }
}
