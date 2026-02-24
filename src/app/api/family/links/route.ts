import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

/** GET /api/family/links — list active/pending family connections for the current user */
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

    // Get user profile to determine account type
    const { data: profile } = await service
      .from("profiles")
      .select("account_type")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const isParent = profile.account_type === "parent";

    // Fetch family links where user is either parent or student
    const { data: links, error } = await service
      .from("family_links")
      .select(`
        id, parent_id, student_id, status,
        can_view_favorites, can_view_folders, can_view_activity,
        created_at, accepted_at
      `)
      .or(`parent_id.eq.${user.id},student_id.eq.${user.id}`)
      .in("status", ["active", "pending"])
      .order("created_at", { ascending: false });

    if (error) throw error;

    // For each link, fetch the *other* person's profile
    const members = await Promise.all(
      (links || []).map(async (link) => {
        const otherId = isParent ? link.student_id : link.parent_id;
        const { data: otherProfile } = await service
          .from("profiles")
          .select("id, display_name, email, account_type, graduation_year, high_school, last_active_at")
          .eq("id", otherId)
          .maybeSingle();

        return {
          linkId: link.id,
          accountType: otherProfile?.account_type || (isParent ? "student" : "parent"),
          id: otherId,
          displayName: otherProfile?.display_name || null,
          email: otherProfile?.email || "",
          avatarUrl: null,
          graduationYear: otherProfile?.graduation_year || null,
          highSchool: otherProfile?.high_school || null,
          lastActiveAt: otherProfile?.last_active_at || null,
          canViewFavorites: link.can_view_favorites,
          canViewFolders: link.can_view_folders,
          canViewActivity: link.can_view_activity,
          status: link.status,
        };
      }),
    );

    return NextResponse.json({ members });
  } catch (error) {
    console.error("Error fetching family links:", error);
    return NextResponse.json(
      { error: "Failed to fetch family links" },
      { status: 500 },
    );
  }
}

/** PATCH /api/family/links — update a family link (revoke, update privacy) */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { linkId, action, canViewFavorites, canViewFolders, canViewActivity } = body;

    if (!linkId) {
      return NextResponse.json({ error: "linkId is required" }, { status: 400 });
    }

    const service = createServiceClient();

    // Verify the user is part of this link
    const { data: link } = await service
      .from("family_links")
      .select("id, parent_id, student_id, status")
      .eq("id", linkId)
      .or(`parent_id.eq.${user.id},student_id.eq.${user.id}`)
      .maybeSingle();

    if (!link) {
      return NextResponse.json({ error: "Family link not found" }, { status: 404 });
    }

    // Handle revoke action
    if (action === "revoke") {
      const { error } = await service
        .from("family_links")
        .update({
          status: "revoked",
          revoked_at: new Date().toISOString(),
        })
        .eq("id", linkId);

      if (error) throw error;
      return NextResponse.json({ message: "Family link revoked" });
    }

    // Handle privacy updates (only the student in the link can change these)
    if (canViewFavorites !== undefined || canViewFolders !== undefined || canViewActivity !== undefined) {
      // Only the student can update privacy settings
      if (link.student_id !== user.id) {
        return NextResponse.json(
          { error: "Only the student can update privacy settings" },
          { status: 403 },
        );
      }

      const updates: Record<string, unknown> = {};
      if (canViewFavorites !== undefined) updates.can_view_favorites = canViewFavorites;
      if (canViewFolders !== undefined) updates.can_view_folders = canViewFolders;
      if (canViewActivity !== undefined) updates.can_view_activity = canViewActivity;

      const { error } = await service
        .from("family_links")
        .update(updates)
        .eq("id", linkId);

      if (error) throw error;
      return NextResponse.json({ message: "Privacy settings updated" });
    }

    return NextResponse.json({ error: "No valid action specified" }, { status: 400 });
  } catch (error) {
    console.error("Error updating family link:", error);
    return NextResponse.json(
      { error: "Failed to update family link" },
      { status: 500 },
    );
  }
}
