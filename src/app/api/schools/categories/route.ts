import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createServiceClient();

    // Supabase caps rows at 1000 per request, so we must paginate to
    // collect every distinct category from the ~22k schools rows.
    const PAGE_SIZE = 1000;
    const allCategories = new Set<string>();
    let offset = 0;
    let done = false;

    while (!done) {
      const { data, error } = await supabase
        .from("schools")
        .select("category")
        .not("category", "is", null)
        .order("category", { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) throw error;

      for (const row of data || []) {
        if (row.category) allCategories.add(row.category as string);
      }

      if (!data || data.length < PAGE_SIZE) {
        done = true;
      } else {
        offset += PAGE_SIZE;
      }
    }

    return NextResponse.json([...allCategories].sort());
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}
