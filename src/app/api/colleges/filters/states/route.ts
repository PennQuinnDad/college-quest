import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createServiceClient();

    // Supabase caps responses at 1000 rows — paginate to get all colleges
    const allStates = new Set<string>();
    let offset = 0;
    while (true) {
      const { data, error } = await supabase
        .from("colleges")
        .select("state")
        .not("state", "is", null)
        .order("state")
        .range(offset, offset + 999);
      if (error) throw error;
      if (!data || data.length === 0) break;
      for (const row of data) {
        if (row.state) allStates.add(row.state as string);
      }
      if (data.length < 1000) break;
      offset += 1000;
    }

    const states = [...allStates].sort();

    const response = NextResponse.json(states);
    response.headers.set("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=86400");
    return response;
  } catch (error) {
    console.error("Error fetching states:", error);
    return NextResponse.json(
      { error: "Failed to fetch states" },
      { status: 500 }
    );
  }
}
