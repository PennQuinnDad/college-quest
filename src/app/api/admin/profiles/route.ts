import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyAdmin } from "@/lib/admin-auth";

export async function GET() {
  const authError = await verifyAdmin();
  if (authError) return authError;

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, display_name, role, account_type, graduation_year, profile_completed, last_active_at")
      .order("email", { ascending: true });

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Error fetching profiles:", error);
    return NextResponse.json(
      { error: "Failed to fetch profiles" },
      { status: 500 },
    );
  }
}
