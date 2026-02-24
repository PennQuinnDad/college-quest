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

    const response = NextResponse.json(regions);
    response.headers.set("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=86400");
    return response;
  } catch (error) {
    console.error("Error fetching regions:", error);
    return NextResponse.json(
      { error: "Failed to fetch regions" },
      { status: 500 }
    );
  }
}
