import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createServiceClient();
    const allStates: string[] = [];
    let page = 0;
    const pageSize = 1000;

    while (true) {
      const { data, error } = await supabase
        .from("colleges")
        .select("state")
        .not("state", "is", null)
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) throw error;
      if (!data || data.length === 0) break;

      for (const row of data) {
        if (row.state && !allStates.includes(row.state)) {
          allStates.push(row.state);
        }
      }

      if (data.length < pageSize) break;
      page++;
    }

    allStates.sort();
    return NextResponse.json(allStates);
  } catch (error) {
    console.error("Error fetching states:", error);
    return NextResponse.json(
      { error: "Failed to fetch states" },
      { status: 500 }
    );
  }
}
