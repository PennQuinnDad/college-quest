import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sanitizeFilterValue } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || searchParams.get("q") || "";

    if (!query || query.length < 2) {
      return NextResponse.json({ colleges: [], programs: [] });
    }

    const safe = sanitizeFilterValue(query);
    if (!safe || safe.length < 2) {
      return NextResponse.json({ colleges: [], programs: [] });
    }

    // Fetch college name matches and program matches in parallel
    const [collegeResult, schoolResult] = await Promise.all([
      supabase
        .from("colleges")
        .select("id, name")
        .ilike("name", `%${safe}%`)
        .limit(7),
      supabase
        .from("schools")
        .select("name, category, college_id")
        .ilike("name", `%${safe}%`)
        .limit(200),
    ]);

    if (collegeResult.error) throw collegeResult.error;

    // Deduplicate programs by name, count distinct colleges per program
    const programMap = new Map<
      string,
      { category: string | null; collegeIds: Set<string> }
    >();
    for (const s of schoolResult.data || []) {
      const key = s.name;
      if (!programMap.has(key)) {
        programMap.set(key, { category: s.category, collegeIds: new Set() });
      }
      programMap.get(key)!.collegeIds.add(s.college_id);
    }

    // Sort by college count descending, take top 5
    const programs = [...programMap.entries()]
      .map(([name, { category, collegeIds }]) => ({
        name,
        category,
        collegeCount: collegeIds.size,
      }))
      .sort((a, b) => b.collegeCount - a.collegeCount)
      .slice(0, 5);

    const response = NextResponse.json({
      colleges: collegeResult.data || [],
      programs,
    });
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=300, stale-while-revalidate=3600"
    );
    return response;
  } catch (error) {
    console.error("Error in autocomplete:", error);
    return NextResponse.json(
      { error: "Failed to fetch autocomplete results" },
      { status: 500 }
    );
  }
}
