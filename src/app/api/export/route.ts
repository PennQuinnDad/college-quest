import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

/**
 * GET /api/export?type=favorites|applications
 * Returns a CSV download of the user's favorites or applications.
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
    const type = searchParams.get("type") || "favorites";

    const service = createServiceClient();

    if (type === "applications") {
      return exportApplications(service, user.id);
    }

    return exportFavorites(service, user.id);
  } catch (error) {
    console.error("Error exporting:", error);
    return NextResponse.json(
      { error: "Failed to export" },
      { status: 500 },
    );
  }
}

async function exportFavorites(
  service: ReturnType<typeof createServiceClient>,
  userId: string,
) {
  // Get favorite college IDs
  const { data: favs } = await service
    .from("favorites")
    .select("college_id")
    .eq("user_id", userId);

  if (!favs || favs.length === 0) {
    return csvResponse("Name,City,State,Type,Size,Tuition In-State,Tuition Out-of-State,Acceptance Rate,Enrollment,Website\n", "favorites");
  }

  const ids = favs.map((f) => f.college_id);
  const { data: colleges } = await service
    .from("colleges")
    .select("name, city, state, type, size, tuition_in_state, tuition_out_of_state, acceptance_rate, enrollment, website")
    .in("id", ids)
    .order("name");

  const header = "Name,City,State,Type,Size,Tuition In-State,Tuition Out-of-State,Acceptance Rate,Enrollment,Website";
  const rows = (colleges || []).map((c) =>
    [
      csvEscape(c.name),
      csvEscape(c.city),
      csvEscape(c.state),
      csvEscape(c.type),
      csvEscape(c.size),
      c.tuition_in_state ?? "",
      c.tuition_out_of_state ?? "",
      c.acceptance_rate != null ? (c.acceptance_rate * 100).toFixed(1) + "%" : "",
      c.enrollment ?? "",
      csvEscape(c.website),
    ].join(","),
  );

  return csvResponse([header, ...rows].join("\n"), "favorites");
}

async function exportApplications(
  service: ReturnType<typeof createServiceClient>,
  userId: string,
) {
  const { data: apps } = await service
    .from("college_applications")
    .select("college_id, status, application_type, deadline, submitted_at, decision_at, notes")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (!apps || apps.length === 0) {
    return csvResponse("College,Status,Application Type,Deadline,Submitted,Decision,Notes\n", "applications");
  }

  const collegeIds = [...new Set(apps.map((a) => a.college_id))];
  const { data: colleges } = await service
    .from("colleges")
    .select("id, name")
    .in("id", collegeIds);

  const nameMap = new Map((colleges || []).map((c) => [c.id, c.name]));

  const header = "College,Status,Application Type,Deadline,Submitted,Decision,Notes";
  const rows = apps.map((a) =>
    [
      csvEscape(nameMap.get(a.college_id) || a.college_id),
      csvEscape(a.status),
      csvEscape(a.application_type),
      a.deadline || "",
      a.submitted_at || "",
      a.decision_at || "",
      csvEscape(a.notes),
    ].join(","),
  );

  return csvResponse([header, ...rows].join("\n"), "applications");
}

function csvEscape(value: string | null | undefined): string {
  if (value == null) return "";
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function csvResponse(csv: string, name: string): NextResponse {
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="college-quest-${name}.csv"`,
    },
  });
}
