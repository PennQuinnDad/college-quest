import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyAdmin } from "@/lib/admin-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = verifyAdmin(request);
  if (authError) return authError;

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
  const authError = verifyAdmin(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const supabase = createServiceClient();
    const body = await request.json();

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    const fieldMap: Record<string, string> = {
      name: "name",
      city: "city",
      state: "state",
      zipCode: "zip_code",
      website: "website",
      region: "region",
      category: "category",
      type: "type",
      size: "size",
      enrollment: "enrollment",
      tuitionInState: "tuition_in_state",
      tuitionOutOfState: "tuition_out_of_state",
      netCost: "net_cost",
      netPricingGuidance: "net_pricing_guidance",
      acceptanceRate: "acceptance_rate",
      satMath: "sat_math",
      satReading: "sat_reading",
      actComposite: "act_composite",
      graduationRate: "graduation_rate",
      programs: "programs",
      description: "description",
      imageUrl: "image_url",
      jesuit: "jesuit",
      scorecardId: "scorecard_id",
    };

    for (const [camel, snake] of Object.entries(fieldMap)) {
      if (body[camel] !== undefined) {
        updates[snake] = body[camel];
      }
    }

    const { data, error } = await supabase
      .from("colleges")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating college:", error);
    return NextResponse.json(
      { error: "Failed to update college" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = verifyAdmin(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const supabase = createServiceClient();

    const { error } = await supabase.from("colleges").delete().eq("id", id);

    if (error) throw error;

    return NextResponse.json({ message: "College deleted" });
  } catch (error) {
    console.error("Error deleting college:", error);
    return NextResponse.json(
      { error: "Failed to delete college" },
      { status: 500 }
    );
  }
}
