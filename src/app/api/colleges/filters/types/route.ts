import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("colleges")
      .select("type")
      .not("type", "is", null)
      .limit(10000);

    if (error) throw error;

    const types = [...new Set(
      (data || []).map((row) => row.type as string).filter(Boolean)
    )].sort();

    const response = NextResponse.json(types);
    response.headers.set("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=86400");
    return response;
  } catch (error) {
    console.error("Error fetching types:", error);
    return NextResponse.json(
      { error: "Failed to fetch types" },
      { status: 500 }
    );
  }
}
