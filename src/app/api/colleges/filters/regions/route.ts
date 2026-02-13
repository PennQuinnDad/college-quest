import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createServiceClient();
    const allRegions: string[] = [];
    let page = 0;
    const pageSize = 1000;

    while (true) {
      const { data, error } = await supabase
        .from("colleges")
        .select("region")
        .not("region", "is", null)
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) throw error;
      if (!data || data.length === 0) break;

      for (const row of data) {
        if (row.region && !allRegions.includes(row.region)) {
          allRegions.push(row.region);
        }
      }

      if (data.length < pageSize) break;
      page++;
    }

    allRegions.sort();
    return NextResponse.json(allRegions);
  } catch (error) {
    console.error("Error fetching regions:", error);
    return NextResponse.json(
      { error: "Failed to fetch regions" },
      { status: 500 }
    );
  }
}
