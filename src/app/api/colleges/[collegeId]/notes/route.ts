import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";

/**
 * GET /api/colleges/[collegeId]/notes
 * Returns the user's own notes + family notes from linked family members.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ collegeId: string }> },
) {
  try {
    const { collegeId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const service = createServiceClient();

    // Get user's own notes (private + family)
    const { data: ownNotes, error: ownError } = await service
      .from("college_notes")
      .select("id, college_id, user_id, content, visibility, created_at, updated_at")
      .eq("college_id", collegeId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (ownError) throw ownError;

    // Find linked family member IDs
    const { data: links } = await service
      .from("family_links")
      .select("parent_id, student_id")
      .or(`parent_id.eq.${user.id},student_id.eq.${user.id}`)
      .eq("status", "active");

    const familyIds = (links || []).map((l) =>
      l.parent_id === user.id ? l.student_id : l.parent_id,
    );

    // Get family members' notes (only those with visibility = 'family')
    let familyNotes: typeof ownNotes = [];
    if (familyIds.length > 0) {
      const { data, error } = await service
        .from("college_notes")
        .select("id, college_id, user_id, content, visibility, created_at, updated_at")
        .eq("college_id", collegeId)
        .in("user_id", familyIds)
        .eq("visibility", "family")
        .order("created_at", { ascending: false });

      if (error) throw error;
      familyNotes = data || [];
    }

    // Get display names for all note authors
    const allUserIds = [...new Set([
      ...(ownNotes || []).map((n) => n.user_id),
      ...(familyNotes || []).map((n) => n.user_id),
    ])];

    const { data: profiles } = allUserIds.length > 0
      ? await service
          .from("profiles")
          .select("id, display_name")
          .in("id", allUserIds)
      : { data: [] };

    const nameMap = new Map((profiles || []).map((p) => [p.id, p.display_name]));

    const allNotes = [...(ownNotes || []), ...(familyNotes || [])].map((n) => ({
      id: n.id,
      collegeId: n.college_id,
      userId: n.user_id,
      userName: nameMap.get(n.user_id) || null,
      content: n.content,
      visibility: n.visibility,
      createdAt: n.created_at,
      updatedAt: n.updated_at,
    }));

    // Sort by created_at descending
    allNotes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ notes: allNotes });
  } catch (error) {
    console.error("Error fetching college notes:", error);
    return NextResponse.json(
      { error: "Failed to fetch notes" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/colleges/[collegeId]/notes
 * Create a note on a college.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ collegeId: string }> },
) {
  try {
    const { collegeId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { content, visibility = "family" } = await request.json();

    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json(
        { error: "Note content is required" },
        { status: 400 },
      );
    }

    if (content.length > 2000) {
      return NextResponse.json(
        { error: "Note must be 2000 characters or less" },
        { status: 400 },
      );
    }

    if (!["private", "family"].includes(visibility)) {
      return NextResponse.json(
        { error: "Visibility must be 'private' or 'family'" },
        { status: 400 },
      );
    }

    const service = createServiceClient();

    const { data, error } = await service
      .from("college_notes")
      .insert({
        college_id: collegeId,
        user_id: user.id,
        content: content.trim(),
        visibility,
      })
      .select()
      .single();

    if (error) throw error;

    // Get author name
    const { data: profile } = await service
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle();

    await logActivity(user.id, "added_note", {
      collegeId,
      visibility: visibility === "private" ? "private" : "family",
    });

    return NextResponse.json(
      {
        id: data.id,
        collegeId: data.college_id,
        userId: data.user_id,
        userName: profile?.display_name || null,
        content: data.content,
        visibility: data.visibility,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating note:", error);
    return NextResponse.json(
      { error: "Failed to create note" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/colleges/[collegeId]/notes
 * Delete a note (only the author can delete their own notes).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ collegeId: string }> },
) {
  try {
    await params; // consume params
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const noteId = searchParams.get("noteId");

    if (!noteId) {
      return NextResponse.json(
        { error: "noteId is required" },
        { status: 400 },
      );
    }

    const service = createServiceClient();

    const { error } = await service
      .from("college_notes")
      .delete()
      .eq("id", noteId)
      .eq("user_id", user.id);

    if (error) throw error;

    return NextResponse.json({ message: "Note deleted" });
  } catch (error) {
    console.error("Error deleting note:", error);
    return NextResponse.json(
      { error: "Failed to delete note" },
      { status: 500 },
    );
  }
}
