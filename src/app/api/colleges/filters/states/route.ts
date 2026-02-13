import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("colleges")
      .select("state")
      .not("state", "is", null)
      .limit(10000);

    if (error) throw error;

    const states = [...new Set(
      (data || []).map((row) => row.state as string).filter(Boolean)
    )].sort();

    return NextResponse.json(states);
  } catch (error) {
    console.error("Error fetching states:", error);
    return NextResponse.json(
      { error: "Failed to fetch states" },
      { status: 500 }
    );
  }
}
