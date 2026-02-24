import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

/**
 * GET /api/family/students — parent-only endpoint
 * Returns connected students with their favorite/folder counts and activity.
 */
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

    // Verify caller is a parent
    const { data: profile } = await service
      .from("profiles")
      .select("account_type")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.account_type !== "parent") {
      return NextResponse.json(
        { error: "Only parent accounts can access this endpoint" },
        { status: 403 },
      );
    }

    // Get active family links where user is parent
    const { data: links, error: linksError } = await service
      .from("family_links")
      .select("id, student_id, can_view_favorites, can_view_folders, can_view_activity")
      .eq("parent_id", user.id)
      .eq("status", "active");

    if (linksError) throw linksError;
    if (!links || links.length === 0) {
      return NextResponse.json({ students: [] });
    }

    // For each student, get profile + counts
    const students = await Promise.all(
      links.map(async (link) => {
        const { data: studentProfile } = await service
          .from("profiles")
          .select("id, display_name, email, graduation_year, high_school, last_active_at")
          .eq("id", link.student_id)
          .maybeSingle();

        if (!studentProfile) return null;

        // Favorite count (only if permitted)
        let favoriteCount = 0;
        if (link.can_view_favorites) {
          const { count } = await service
            .from("favorites")
            .select("*", { count: "exact", head: true })
            .eq("user_id", link.student_id);
          favoriteCount = count || 0;
        }

        // Folder count (only if permitted)
        let folderCount = 0;
        if (link.can_view_folders) {
          const { count } = await service
            .from("favorite_folders")
            .select("*", { count: "exact", head: true })
            .eq("user_id", link.student_id);
          folderCount = count || 0;
        }

        return {
          linkId: link.id,
          id: studentProfile.id,
          displayName: studentProfile.display_name,
          email: studentProfile.email,
          graduationYear: studentProfile.graduation_year,
          highSchool: studentProfile.high_school,
          lastActiveAt: link.can_view_activity ? studentProfile.last_active_at : null,
          favoriteCount,
          folderCount,
          canViewFavorites: link.can_view_favorites,
          canViewFolders: link.can_view_folders,
          canViewActivity: link.can_view_activity,
        };
      }),
    );

    return NextResponse.json({
      students: students.filter(Boolean),
    });
  } catch (error) {
    console.error("Error fetching students:", error);
    return NextResponse.json(
      { error: "Failed to fetch students" },
      { status: 500 },
    );
  }
}
