import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const service = createServiceClient();
    const { data, error } = await service
      .from("favorites")
      .select("college_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      favorites: (data || []).map((f: { college_id: string }) => f.college_id),
    });
  } catch (error) {
    console.error("Error fetching favorites:", error);
    return NextResponse.json(
      { error: "Failed to fetch favorites" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { collegeId } = await request.json();

    if (!collegeId || typeof collegeId !== "string") {
      return NextResponse.json(
        { error: "collegeId is required" },
        { status: 400 }
      );
    }

    const service = createServiceClient();

    // Upsert profile
    await service.from("profiles").upsert(
      {
        id: user.id,
        email: user.email,
        display_name: user.user_metadata?.full_name || null,
        role: "user",
      },
      { onConflict: "id", ignoreDuplicates: true }
    );

    // Add favorite
    const { error } = await service.from("favorites").insert({
      user_id: user.id,
      college_id: collegeId,
    });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { message: "Favorite already exists" },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json({ message: "Favorite added" }, { status: 201 });
  } catch (error) {
    console.error("Error adding favorite:", error);
    return NextResponse.json(
      { error: "Failed to add favorite" },
      { status: 500 }
    );
  }
}
