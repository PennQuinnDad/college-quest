import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

/**
 * GET /api/family/activity?studentId=...&limit=...
 * Returns the activity feed for a family member (parent viewing student activity).
 * If no studentId is provided, returns the current user's own activity.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");
    const limit = Math.min(parseInt(searchParams.get("limit") || "30"), 100);

    const service = createServiceClient();
    let targetUserId = user.id;

    // If requesting another user's activity, verify family link
    if (studentId && studentId !== user.id) {
      const { data: link } = await service
        .from("family_links")
        .select("id, can_view_activity")
        .or(
          `and(parent_id.eq.${user.id},student_id.eq.${studentId}),and(parent_id.eq.${studentId},student_id.eq.${user.id})`,
        )
        .eq("status", "active")
        .maybeSingle();

      if (!link) {
        return NextResponse.json(
          { error: "No active family link" },
          { status: 403 },
        );
      }

      if (!link.can_view_activity) {
        return NextResponse.json(
          { error: "Activity viewing not permitted" },
          { status: 403 },
        );
      }

      targetUserId = studentId;
    }

    // Fetch activity events (only family-visible if viewing another user)
    let query = service
      .from("activity_log")
      .select("id, user_id, action, college_id, metadata, visibility, created_at")
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (targetUserId !== user.id) {
      query = query.eq("visibility", "family");
    }

    const { data: events, error } = await query;
    if (error) throw error;

    if (!events || events.length === 0) {
      return NextResponse.json({ events: [] });
    }

    // Enrich with college names
    const collegeIds = [
      ...new Set(events.map((e) => e.college_id).filter(Boolean)),
    ];

    let collegeMap = new Map<string, { name: string; city: string; state: string }>();
    if (collegeIds.length > 0) {
      const { data: colleges } = await service
        .from("colleges")
        .select("id, name, city, state")
        .in("id", collegeIds);
      if (colleges) {
        collegeMap = new Map(colleges.map((c) => [c.id, c]));
      }
    }

    // Get user's display name
    const { data: profile } = await service
      .from("profiles")
      .select("display_name")
      .eq("id", targetUserId)
      .single();

    const enriched = events.map((e) => {
      const college = e.college_id ? collegeMap.get(e.college_id) : null;
      return {
        id: e.id,
        userId: e.user_id,
        userName: profile?.display_name || null,
        action: e.action,
        collegeId: e.college_id,
        collegeName: college?.name || null,
        metadata: e.metadata,
        visibility: e.visibility,
        createdAt: e.created_at,
      };
    });

    return NextResponse.json({ events: enriched });
  } catch (error) {
    console.error("Error fetching activity:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity" },
      { status: 500 },
    );
  }
}
