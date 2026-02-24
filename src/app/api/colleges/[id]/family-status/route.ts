import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

/**
 * GET /api/colleges/[id]/family-status
 * Returns which family members have this college favorited.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const service = createServiceClient();

    // Find linked family members (active links only)
    const { data: links } = await service
      .from("family_links")
      .select("parent_id, student_id, can_view_favorites")
      .or(`parent_id.eq.${user.id},student_id.eq.${user.id}`)
      .eq("status", "active");

    if (!links || links.length === 0) {
      return NextResponse.json({ familyFavorites: [] });
    }

    // Collect family member IDs (only those who allow viewing favorites)
    const familyIds: string[] = [];
    for (const link of links) {
      const otherId = link.parent_id === user.id ? link.student_id : link.parent_id;
      // If the user is the parent, check can_view_favorites (student controls this)
      // If the user is the student, parents always see that the student has favorited
      if (link.can_view_favorites) {
        familyIds.push(otherId);
      }
    }

    if (familyIds.length === 0) {
      return NextResponse.json({ familyFavorites: [] });
    }

    // Check which family members have this college favorited
    const { data: favs, error } = await service
      .from("favorites")
      .select("user_id")
      .eq("college_id", id)
      .in("user_id", familyIds);

    if (error) throw error;

    if (!favs || favs.length === 0) {
      return NextResponse.json({ familyFavorites: [] });
    }

    // Get display names
    const favUserIds = favs.map((f: { user_id: string }) => f.user_id);
    const { data: profiles } = await service
      .from("profiles")
      .select("id, display_name, account_type")
      .in("id", favUserIds);

    const familyFavorites = (profiles || []).map((p) => ({
      id: p.id,
      displayName: p.display_name,
      accountType: p.account_type,
    }));

    return NextResponse.json({ familyFavorites });
  } catch (error) {
    console.error("Error fetching family status:", error);
    return NextResponse.json(
      { error: "Failed to fetch family status" },
      { status: 500 },
    );
  }
}
