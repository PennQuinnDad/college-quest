import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sanitizeFilterValue } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || searchParams.get("q") || "";

    if (!query || query.length < 2) {
      return NextResponse.json([]);
    }

    const safe = sanitizeFilterValue(query);
    if (!safe || safe.length < 2) {
      return NextResponse.json([]);
    }

    const { data, error } = await supabase
      .from("colleges")
      .select("id, name")
      .ilike("name", `%${safe}%`)
      .limit(10);

    if (error) throw error;

    const response = NextResponse.json(data || []);
    response.headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
    return response;
  } catch (error) {
    console.error("Error in autocomplete:", error);
    return NextResponse.json(
      { error: "Failed to fetch autocomplete results" },
      { status: 500 }
    );
  }
}
