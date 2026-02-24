import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { computeSimilarityScore, ScoringCollege } from "@/lib/similarity";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "6"), 60);

    // Fetch target college — only the fields needed for similarity scoring
    const similarFields = "id,name,city,state,region,type,size,jesuit,enrollment,acceptance_rate,tuition_in_state,graduation_rate,sat_math,sat_reading,programs,latitude,longitude,website,net_cost";
    const { data: target, error: targetError } = await supabase
      .from("colleges")
      .select(similarFields)
      .eq("id", id)
      .single();

    if (targetError) {
      return NextResponse.json(
        { error: "College not found" },
        { status: 404 }
      );
    }

    // Fetch candidates — same fields, no need for description/full payload
    const { data: candidates, error: candidatesError } = await supabase
      .from("colleges")
      .select(similarFields)
      .neq("id", id)
      .limit(200);

    if (candidatesError) throw candidatesError;

    // Score similarity
    const scored = (candidates || []).map((c: Record<string, unknown>) => {
      const score = computeSimilarityScore(
        target as ScoringCollege,
        c as ScoringCollege,
      );
      return { ...c, similarityScore: score };
    });

    scored.sort(
      (a: { similarityScore: number }, b: { similarityScore: number }) =>
        b.similarityScore - a.similarityScore
    );

    const response = NextResponse.json(scored.slice(0, limit));
    response.headers.set("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=86400");
    return response;
  } catch (error) {
    console.error("Error finding similar colleges:", error);
    return NextResponse.json(
      { error: "Failed to find similar colleges" },
      { status: 500 }
    );
  }
}
