import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createServiceClient();

    // Supabase caps responses at 1000 rows — paginate to get all colleges
    const allTypes = new Set<string>();
    let offset = 0;
    while (true) {
      const { data, error } = await supabase
        .from("colleges")
        .select("type")
        .not("type", "is", null)
        .order("type")
        .range(offset, offset + 999);
      if (error) throw error;
      if (!data || data.length === 0) break;
      for (const row of data) {
        if (row.type) allTypes.add(row.type as string);
      }
      if (data.length < 1000) break;
      offset += 1000;
    }

    const types = [...allTypes].sort();

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
