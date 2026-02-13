import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createServiceClient();
    const allTypes: string[] = [];
    let page = 0;
    const pageSize = 1000;

    while (true) {
      const { data, error } = await supabase
        .from("colleges")
        .select("type")
        .not("type", "is", null)
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) throw error;
      if (!data || data.length === 0) break;

      for (const row of data) {
        if (row.type && !allTypes.includes(row.type)) {
          allTypes.push(row.type);
        }
      }

      if (data.length < pageSize) break;
      page++;
    }

    allTypes.sort();
    return NextResponse.json(allTypes);
  } catch (error) {
    console.error("Error fetching types:", error);
    return NextResponse.json(
      { error: "Failed to fetch types" },
      { status: 500 }
    );
  }
}
