import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "6"), 60);

    // Fetch target college
    const { data: target, error: targetError } = await supabase
      .from("colleges")
      .select("*")
      .eq("id", id)
      .single();

    if (targetError) {
      return NextResponse.json(
        { error: "College not found" },
        { status: 404 }
      );
    }

    // Fetch candidates
    const { data: candidates, error: candidatesError } = await supabase
      .from("colleges")
      .select("*")
      .neq("id", id)
      .limit(200);

    if (candidatesError) throw candidatesError;

    // Score similarity
    const scored = (candidates || []).map((c: Record<string, unknown>) => {
      let score = 0;

      if (c.region === target.region) score += 20;
      if (c.state === target.state) score += 10;
      if (c.type === target.type) score += 15;
      if (c.size === target.size) score += 10;
      if (c.jesuit === target.jesuit) score += 5;

      if (target.enrollment && c.enrollment) {
        const ratio = Math.abs(
          (c.enrollment as number) - target.enrollment
        ) / target.enrollment;
        if (ratio <= 0.25) score += 10;
        else if (ratio <= 0.5) score += 5;
      }

      if (target.acceptance_rate != null && c.acceptance_rate != null) {
        const diff = Math.abs(
          (c.acceptance_rate as number) - target.acceptance_rate
        );
        if (diff <= 0.05) score += 10;
        else if (diff <= 0.1) score += 5;
      }

      if (target.tuition_in_state && c.tuition_in_state) {
        const ratio = Math.abs(
          (c.tuition_in_state as number) - target.tuition_in_state
        ) / target.tuition_in_state;
        if (ratio <= 0.2) score += 10;
        else if (ratio <= 0.4) score += 5;
      }

      if (target.graduation_rate != null && c.graduation_rate != null) {
        const diff = Math.abs(
          (c.graduation_rate as number) - target.graduation_rate
        );
        if (diff <= 0.05) score += 5;
        else if (diff <= 0.1) score += 3;
      }

      if (target.sat_math && target.sat_reading && c.sat_math && c.sat_reading) {
        const targetSat = target.sat_math + target.sat_reading;
        const cSat = (c.sat_math as number) + (c.sat_reading as number);
        const diff = Math.abs(cSat - targetSat);
        if (diff <= 50) score += 5;
        else if (diff <= 100) score += 3;
      }

      // Program overlap
      if (target.programs && c.programs) {
        const targetPrograms = new Set(target.programs as string[]);
        const overlap = (c.programs as string[]).filter((p: string) =>
          targetPrograms.has(p)
        ).length;
        score += Math.min(overlap * 2, 10);
      }

      return { ...c, similarityScore: score };
    });

    scored.sort(
      (a: { similarityScore: number }, b: { similarityScore: number }) =>
        b.similarityScore - a.similarityScore
    );

    return NextResponse.json(scored.slice(0, limit));
  } catch (error) {
    console.error("Error finding similar colleges:", error);
    return NextResponse.json(
      { error: "Failed to find similar colleges" },
      { status: 500 }
    );
  }
}
