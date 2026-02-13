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
      .from("favorite_folders")
      .select("id, name, color, position, created_at, updated_at")
      .eq("user_id", user.id)
      .order("position", { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      folders: (data || []).map((f) => ({
        id: f.id,
        name: f.name,
        color: f.color,
        position: f.position,
        createdAt: f.created_at,
        updatedAt: f.updated_at,
      })),
    });
  } catch (error) {
    console.error("Error fetching folders:", error);
    return NextResponse.json(
      { error: "Failed to fetch folders" },
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

    const { name, color } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Folder name is required" },
        { status: 400 }
      );
    }

    const service = createServiceClient();

    // Check folder count
    const { count } = await service
      .from("favorite_folders")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (count && count >= 20) {
      return NextResponse.json(
        { error: "Maximum of 20 folders allowed" },
        { status: 400 }
      );
    }

    // Get next position
    const { data: lastFolder } = await service
      .from("favorite_folders")
      .select("position")
      .eq("user_id", user.id)
      .order("position", { ascending: false })
      .limit(1);

    const nextPosition = lastFolder && lastFolder.length > 0 ? lastFolder[0].position + 1 : 0;

    const { data, error } = await service
      .from("favorite_folders")
      .insert({
        user_id: user.id,
        name: name.trim(),
        color: color || null,
        position: nextPosition,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A folder with this name already exists" },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error creating folder:", error);
    return NextResponse.json(
      { error: "Failed to create folder" },
      { status: 500 }
    );
  }
}
