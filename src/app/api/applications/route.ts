import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";

const VALID_STATUSES = [
  "researching", "applying", "applied",
  "accepted", "rejected", "waitlisted", "deferred",
  "enrolled", "withdrawn",
];

const VALID_APP_TYPES = ["early_decision", "early_action", "regular", "rolling"];

/**
 * GET /api/applications
 * Returns all college applications for the current user.
 * Parents can pass ?studentId=... to view a student's shared applications.
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
    const service = createServiceClient();
    let targetUserId = user.id;
    let familyView = false;

    if (studentId && studentId !== user.id) {
      // Verify family link exists
      const { data: link } = await service
        .from("family_links")
        .select("id")
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
      targetUserId = studentId;
      familyView = true;
    }

    let query = service
      .from("college_applications")
      .select("*")
      .eq("user_id", targetUserId)
      .order("updated_at", { ascending: false });

    // Only show shared applications when parent is viewing
    if (familyView) {
      query = query.eq("shared_with_family", true);
    }

    const { data: apps, error } = await query;
    if (error) throw error;

    if (!apps || apps.length === 0) {
      return NextResponse.json({ applications: [] });
    }

    // Enrich with college info
    const collegeIds = [...new Set(apps.map((a) => a.college_id))];
    const { data: colleges } = await service
      .from("colleges")
      .select("id, name, city, state")
      .in("id", collegeIds);
    const collegeMap = new Map((colleges || []).map((c) => [c.id, c]));

    const applications = apps.map((a) => {
      const college = collegeMap.get(a.college_id);
      return {
        id: a.id,
        userId: a.user_id,
        collegeId: a.college_id,
        collegeName: college?.name || null,
        collegeCity: college?.city || null,
        collegeState: college?.state || null,
        status: a.status,
        applicationType: a.application_type,
        deadline: a.deadline,
        submittedAt: a.submitted_at,
        decisionAt: a.decision_at,
        notes: a.notes,
        sharedWithFamily: a.shared_with_family,
        createdAt: a.created_at,
        updatedAt: a.updated_at,
      };
    });

    return NextResponse.json({ applications });
  } catch (error) {
    console.error("Error fetching applications:", error);
    return NextResponse.json(
      { error: "Failed to fetch applications" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/applications
 * Create or update a college application (upsert by user+college).
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

    const body = await request.json();
    const { collegeId, status, applicationType, deadline, notes, sharedWithFamily } = body;

    if (!collegeId) {
      return NextResponse.json(
        { error: "collegeId is required" },
        { status: 400 },
      );
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 },
      );
    }

    if (applicationType && !VALID_APP_TYPES.includes(applicationType)) {
      return NextResponse.json(
        { error: `Invalid application type. Must be one of: ${VALID_APP_TYPES.join(", ")}` },
        { status: 400 },
      );
    }

    if (notes && notes.length > 1000) {
      return NextResponse.json(
        { error: "Notes must be 1000 characters or less" },
        { status: 400 },
      );
    }

    const service = createServiceClient();

    // Build the insert/update object
    const record: Record<string, unknown> = {
      user_id: user.id,
      college_id: collegeId,
      status: status || "researching",
      updated_at: new Date().toISOString(),
    };

    if (applicationType !== undefined) record.application_type = applicationType || null;
    if (deadline !== undefined) record.deadline = deadline || null;
    if (notes !== undefined) record.notes = notes?.trim() || null;
    if (sharedWithFamily !== undefined) record.shared_with_family = sharedWithFamily;

    // Set timestamps based on status
    if (status === "applied" && !body.submittedAt) {
      record.submitted_at = new Date().toISOString();
    } else if (body.submittedAt !== undefined) {
      record.submitted_at = body.submittedAt || null;
    }

    if (["accepted", "rejected", "waitlisted", "deferred"].includes(status) && !body.decisionAt) {
      record.decision_at = new Date().toISOString();
    } else if (body.decisionAt !== undefined) {
      record.decision_at = body.decisionAt || null;
    }

    // Upsert (insert or update on conflict)
    const { data, error } = await service
      .from("college_applications")
      .upsert(record, { onConflict: "user_id,college_id" })
      .select()
      .single();

    if (error) throw error;

    // Log activity
    await logActivity(user.id, "updated_application", {
      collegeId,
      metadata: { status: record.status },
    });

    return NextResponse.json({
      id: data.id,
      collegeId: data.college_id,
      status: data.status,
      applicationType: data.application_type,
      deadline: data.deadline,
      submittedAt: data.submitted_at,
      decisionAt: data.decision_at,
      notes: data.notes,
      sharedWithFamily: data.shared_with_family,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }, { status: 200 });
  } catch (error) {
    console.error("Error saving application:", error);
    return NextResponse.json(
      { error: "Failed to save application" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/applications?id=...
 * Remove a college application.
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Application id is required" },
        { status: 400 },
      );
    }

    const service = createServiceClient();
    const { error } = await service
      .from("college_applications")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;

    return NextResponse.json({ message: "Application removed" });
  } catch (error) {
    console.error("Error deleting application:", error);
    return NextResponse.json(
      { error: "Failed to delete application" },
      { status: 500 },
    );
  }
}
