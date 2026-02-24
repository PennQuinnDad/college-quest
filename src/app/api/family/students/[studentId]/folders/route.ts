import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { verifyParentAccess } from "@/lib/family-auth";

/**
 * GET /api/family/students/[studentId]/folders
 * Parent-only: returns the student's shared folders with item counts.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> },
) {
  try {
    const { studentId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify parent has access to this student's folders
    const link = await verifyParentAccess(user.id, studentId, "can_view_folders");
    if (!link) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 },
      );
    }

    const service = createServiceClient();

    // Get student's folders that are shared with family
    const { data: folders, error: foldersError } = await service
      .from("favorite_folders")
      .select("id, name, color, position, shared_with_family, created_at, updated_at")
      .eq("user_id", studentId)
      .eq("shared_with_family", true)
      .order("position", { ascending: true });

    if (foldersError) throw foldersError;

    // Get item counts for each folder
    const foldersWithCounts = await Promise.all(
      (folders || []).map(async (folder) => {
        const { count } = await service
          .from("favorite_folder_items")
          .select("*", { count: "exact", head: true })
          .eq("folder_id", folder.id);

        return {
          id: folder.id,
          name: folder.name,
          color: folder.color,
          position: folder.position,
          itemCount: count || 0,
          createdAt: folder.created_at,
          updatedAt: folder.updated_at,
        };
      }),
    );

    return NextResponse.json({ folders: foldersWithCounts });
  } catch (error) {
    console.error("Error fetching student folders:", error);
    return NextResponse.json(
      { error: "Failed to fetch student folders" },
      { status: 500 },
    );
  }
}
