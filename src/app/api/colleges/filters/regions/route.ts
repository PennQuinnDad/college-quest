import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("colleges")
      .select("region")
      .not("region", "is", null)
      .limit(10000);

    if (error) throw error;

    const regions = [...new Set(
      (data || []).map((row) => row.region as string).filter(Boolean)
    )].sort();

    return NextResponse.json(regions);
  } catch (error) {
    console.error("Error fetching regions:", error);
    return NextResponse.json(
      { error: "Failed to fetch regions" },
      { status: 500 }
    );
  }
}
