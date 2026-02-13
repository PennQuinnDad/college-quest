import { NextResponse } from "next/server";
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

    // Get favorites
    const { data: favorites } = await service
      .from("favorites")
      .select("college_id")
      .eq("user_id", user.id);

    // Get folder items
    const { data: folders } = await service
      .from("favorite_folders")
      .select("id")
      .eq("user_id", user.id);

    const folderIds = (folders || []).map((f) => f.id);
    let folderItems: { college_id: string }[] = [];

    if (folderIds.length > 0) {
      const { data } = await service
        .from("favorite_folder_items")
        .select("college_id")
        .in("folder_id", folderIds);
      folderItems = data || [];
    }

    const allIds = new Set([
      ...(favorites || []).map((f: { college_id: string }) => f.college_id),
      ...folderItems.map((i) => i.college_id),
    ]);

    return NextResponse.json({ items: [...allIds] });
  } catch (error) {
    console.error("Error fetching all items:", error);
    return NextResponse.json(
      { error: "Failed to fetch all items" },
      { status: 500 }
    );
  }
}
