import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createServiceClient();

    // Use a single query to get all categories, then deduplicate in JS.
    // Fetch only the category column with a large limit to avoid pagination.
    const { data, error } = await supabase
      .from("schools")
      .select("category")
      .not("category", "is", null)
      .limit(10000);

    if (error) throw error;

    const categories = [...new Set(
      (data || []).map((row) => row.category as string).filter(Boolean)
    )].sort();

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}
