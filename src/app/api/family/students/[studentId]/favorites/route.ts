import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { verifyParentAccess } from "@/lib/family-auth";

/**
 * GET /api/family/students/[studentId]/favorites
 * Parent-only: returns the student's favorited colleges with basic info.
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

    // Verify parent has access to this student's favorites
    const link = await verifyParentAccess(user.id, studentId, "can_view_favorites");
    if (!link) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 },
      );
    }

    const service = createServiceClient();

    // Get student's favorite college IDs
    const { data: favs, error: favsError } = await service
      .from("favorites")
      .select("college_id")
      .eq("user_id", studentId)
      .order("created_at", { ascending: false });

    if (favsError) throw favsError;

    const collegeIds = (favs || []).map((f: { college_id: string }) => f.college_id);

    if (collegeIds.length === 0) {
      return NextResponse.json({ colleges: [] });
    }

    // Fetch college details
    const { data: colleges, error: collegesError } = await service
      .from("colleges")
      .select("id, name, city, state, type, acceptance_rate, tuition_out_of_state, image_url")
      .in("id", collegeIds);

    if (collegesError) throw collegesError;

    // Preserve favorites order
    const collegeMap = new Map((colleges || []).map((c) => [c.id, c]));
    const ordered = collegeIds
      .map((id: string) => collegeMap.get(id))
      .filter((c): c is NonNullable<typeof c> => !!c)
      .map((c) => ({
        id: c.id,
        name: c.name,
        city: c.city,
        state: c.state,
        type: c.type,
        acceptanceRate: c.acceptance_rate,
        tuitionOutOfState: c.tuition_out_of_state,
        imageUrl: c.image_url,
      }));

    return NextResponse.json({ colleges: ordered });
  } catch (error) {
    console.error("Error fetching student favorites:", error);
    return NextResponse.json(
      { error: "Failed to fetch student favorites" },
      { status: 500 },
    );
  }
}
