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

    return NextResponse.json(types);
  } catch (error) {
    console.error("Error fetching types:", error);
    return NextResponse.json(
      { error: "Failed to fetch types" },
      { status: 500 }
    );
  }
}
