import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { v4 as uuidv4 } from "uuid";

export async function GET(request: NextRequest) {
  const authError = verifyAdmin(request);
  if (authError) return authError;

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.from("schools").select("*");

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Error fetching schools:", error);
    return NextResponse.json(
      { error: "Failed to fetch schools" },
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

    if (!body.name || !body.collegeId) {
      return NextResponse.json(
        { error: "name and collegeId are required" },
        { status: 400 }
      );
    }

    const school = {
      id: body.id || uuidv4(),
      name: body.name,
      college_id: body.collegeId,
      college_name: body.collegeName ?? null,
      college_city: body.collegeCity ?? null,
      college_state: body.collegeState ?? null,
      category: body.category ?? null,
      cip_code: body.cipCode ?? null,
      website: body.website ?? null,
      description: body.description ?? null,
      source: body.source || "manual",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("schools")
      .insert(school)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error creating school:", error);
    return NextResponse.json(
      { error: "Failed to create school" },
      { status: 500 }
    );
  }
}
