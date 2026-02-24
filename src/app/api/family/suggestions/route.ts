import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications";
import { isValidUUID } from "@/lib/utils";

/**
 * GET /api/family/suggestions
 * Returns suggestions for the current user (both sent and received).
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

    // Suggestions received by this user (pending only)
    const { data: received, error: recvErr } = await service
      .from("college_suggestions")
      .select("id, college_id, from_user_id, to_user_id, note, status, created_at")
      .eq("to_user_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (recvErr) throw recvErr;

    // Suggestions sent by this user
    const { data: sent, error: sentErr } = await service
      .from("college_suggestions")
      .select("id, college_id, from_user_id, to_user_id, note, status, created_at")
      .eq("from_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (sentErr) throw sentErr;

    // Collect all college IDs and user IDs for enrichment
    const allSuggestions = [...(received || []), ...(sent || [])];
    const collegeIds = [...new Set(allSuggestions.map((s) => s.college_id))];
    const userIds = [...new Set([
      ...allSuggestions.map((s) => s.from_user_id),
      ...allSuggestions.map((s) => s.to_user_id),
    ])];

    // Fetch college names
    const { data: colleges } = collegeIds.length > 0
      ? await service
          .from("colleges")
          .select("id, name, city, state")
          .in("id", collegeIds)
      : { data: [] };
    const collegeMap = new Map((colleges || []).map((c) => [c.id, c]));

    // Fetch user names
    const { data: profiles } = userIds.length > 0
      ? await service
          .from("profiles")
          .select("id, display_name")
          .in("id", userIds)
      : { data: [] };
    const nameMap = new Map((profiles || []).map((p) => [p.id, p.display_name]));

    function mapSuggestion(s: typeof allSuggestions[number]) {
      const college = collegeMap.get(s.college_id);
      return {
        id: s.id,
        collegeId: s.college_id,
        collegeName: college?.name || null,
        collegeCity: college?.city || null,
        collegeState: college?.state || null,
        fromUserId: s.from_user_id,
        fromUserName: nameMap.get(s.from_user_id) || null,
        toUserId: s.to_user_id,
        note: s.note,
        status: s.status,
        createdAt: s.created_at,
      };
    }

    return NextResponse.json({
      received: (received || []).map(mapSuggestion),
      sent: (sent || []).map(mapSuggestion),
    });
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    return NextResponse.json(
      { error: "Failed to fetch suggestions" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/family/suggestions
 * Create a college suggestion (parent → student or vice versa).
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { collegeId, toUserId, note } = await request.json();

    if (!collegeId || !toUserId) {
      return NextResponse.json(
        { error: "collegeId and toUserId are required" },
        { status: 400 },
      );
    }

    if (!isValidUUID(collegeId) || !isValidUUID(toUserId)) {
      return NextResponse.json(
        { error: "Invalid collegeId or toUserId format" },
        { status: 400 },
      );
    }

    if (toUserId === user.id) {
      return NextResponse.json(
        { error: "Cannot suggest a college to yourself" },
        { status: 400 },
      );
    }

    if (note && note.length > 500) {
      return NextResponse.json(
        { error: "Note must be 500 characters or less" },
        { status: 400 },
      );
    }

    const service = createServiceClient();

    // Verify there's an active family link between the two users
    const { data: link } = await service
      .from("family_links")
      .select("id")
      .or(
        `and(parent_id.eq.${user.id},student_id.eq.${toUserId}),and(parent_id.eq.${toUserId},student_id.eq.${user.id})`,
      )
      .eq("status", "active")
      .maybeSingle();

    if (!link) {
      return NextResponse.json(
        { error: "You can only suggest colleges to linked family members" },
        { status: 403 },
      );
    }

    const { data, error } = await service
      .from("college_suggestions")
      .insert({
        college_id: collegeId,
        from_user_id: user.id,
        to_user_id: toUserId,
        note: note?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "You already suggested this college" },
          { status: 409 },
        );
      }
      throw error;
    }

    // Notify the recipient about the new suggestion
    const { data: fromProfile } = await service
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle();

    const { data: college } = await service
      .from("colleges")
      .select("name")
      .eq("id", collegeId)
      .maybeSingle();

    const fromName = fromProfile?.display_name || "A family member";
    const collegeName = college?.name || "a college";
    await createNotification(
      toUserId,
      "new_suggestion",
      `${fromName} suggested ${collegeName}`,
      {
        message: note?.trim() || `Check out ${collegeName}!`,
        link: `/college/${collegeId}`,
      },
    );

    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch (error) {
    console.error("Error creating suggestion:", error);
    return NextResponse.json(
      { error: "Failed to create suggestion" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/family/suggestions
 * Respond to a suggestion (accept or dismiss).
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { suggestionId, action } = await request.json();

    if (!suggestionId || !["accepted", "dismissed"].includes(action)) {
      return NextResponse.json(
        { error: "suggestionId and action (accepted|dismissed) are required" },
        { status: 400 },
      );
    }

    const service = createServiceClient();

    const { error } = await service
      .from("college_suggestions")
      .update({
        status: action,
        responded_at: new Date().toISOString(),
      })
      .eq("id", suggestionId)
      .eq("to_user_id", user.id)
      .eq("status", "pending");

    if (error) throw error;

    return NextResponse.json({ message: `Suggestion ${action}` });
  } catch (error) {
    console.error("Error updating suggestion:", error);
    return NextResponse.json(
      { error: "Failed to update suggestion" },
      { status: 500 },
    );
  }
}
