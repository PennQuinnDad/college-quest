import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tourId: string }> }
) {
  try {
    const { tourId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const service = createServiceClient();

    // Verify tour ownership
    const { data: tour } = await service
      .from("tours")
      .select("id")
      .eq("id", tourId)
      .eq("user_id", user.id)
      .single();

    if (!tour) {
      return NextResponse.json({ error: "Tour not found" }, { status: 404 });
    }

    // Get next position
    const { data: lastDay } = await service
      .from("tour_days")
      .select("position")
      .eq("tour_id", tourId)
      .order("position", { ascending: false })
      .limit(1);

    const nextPosition = lastDay && lastDay.length > 0 ? lastDay[0].position + 1 : 0;

    const body = await request.json();

    const { data: day, error } = await service
      .from("tour_days")
      .insert({
        tour_id: tourId,
        position: nextPosition,
        title: body.title || null,
        date: body.date || null,
        notes: body.notes || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(
      {
        id: day.id,
        tourId: day.tour_id,
        position: day.position,
        title: day.title,
        date: day.date,
        notes: day.notes,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding day:", error);
    return NextResponse.json(
      { error: "Failed to add day" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tourId: string }> }
) {
  try {
    const { tourId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const service = createServiceClient();

    // Verify tour ownership
    const { data: tour } = await service
      .from("tours")
      .select("id")
      .eq("id", tourId)
      .eq("user_id", user.id)
      .single();

    if (!tour) {
      return NextResponse.json({ error: "Tour not found" }, { status: 404 });
    }

    const { days } = await request.json();

    if (!Array.isArray(days)) {
      return NextResponse.json(
        { error: "days array is required" },
        { status: 400 }
      );
    }

    // Bulk reorder days
    for (const item of days) {
      const { error } = await service
        .from("tour_days")
        .update({ position: item.position, updated_at: new Date().toISOString() })
        .eq("id", item.id)
        .eq("tour_id", tourId);

      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reordering days:", error);
    return NextResponse.json(
      { error: "Failed to reorder days" },
      { status: 500 }
    );
  }
}
