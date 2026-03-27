import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// ── Shared helper ────────────────────────────────────────────────────────────
// Paginates through the schools table, collecting distinct college IDs per
// category.  When `filterIds` is provided only those college IDs are counted.
async function collectCategoryCounts(
  supabase: ReturnType<typeof createServiceClient>,
  filterIds?: Set<string>,
) {
  const PAGE_SIZE = 1000;
  const collegeSets = new Map<string, Set<string>>();
  let offset = 0;
  let done = false;

  while (!done) {
    const { data, error } = await supabase
      .from("schools")
      .select("category, college_id")
      .not("category", "is", null)
      .order("category", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw error;

    for (const row of data || []) {
      if (!row.category) continue;
      // When filtering, skip colleges not in the viewport set
      if (filterIds && !filterIds.has(row.college_id as string)) continue;
      const cat = row.category as string;
      if (!collegeSets.has(cat)) collegeSets.set(cat, new Set());
      collegeSets.get(cat)!.add(row.college_id as string);
    }

    if (!data || data.length < PAGE_SIZE) {
      done = true;
    } else {
      offset += PAGE_SIZE;
    }
  }

  return [...collegeSets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, ids]) => ({ name, count: ids.size }));
}

// ── GET: global counts (all colleges) ────────────────────────────────────────
export async function GET() {
  try {
    const supabase = createServiceClient();
    const result = await collectCategoryCounts(supabase);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 },
    );
  }
}

// ── POST: counts filtered to a specific set of college IDs ───────────────────
export async function POST(request: NextRequest) {
  try {
    const { collegeIds } = (await request.json()) as {
      collegeIds?: string[];
    };
    if (!collegeIds || !Array.isArray(collegeIds) || collegeIds.length === 0) {
      return NextResponse.json(
        { error: "collegeIds array is required" },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();
    const filterSet = new Set(collegeIds);
    const result = await collectCategoryCounts(supabase, filterSet);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching filtered categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 },
    );
  }
}
