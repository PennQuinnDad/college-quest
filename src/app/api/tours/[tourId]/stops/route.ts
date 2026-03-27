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

    const { dayId, collegeId } = await request.json();

    if (!dayId || !collegeId) {
      return NextResponse.json(
        { error: "dayId and collegeId are required" },
        { status: 400 }
      );
    }

    // Verify day belongs to this tour
    const { data: day } = await service
      .from("tour_days")
      .select("id")
      .eq("id", dayId)
      .eq("tour_id", tourId)
      .single();

    if (!day) {
      return NextResponse.json({ error: "Day not found" }, { status: 404 });
    }

    // Get next position
    const { data: lastStop } = await service
      .from("tour_stops")
      .select("position")
      .eq("tour_day_id", dayId)
      .order("position", { ascending: false })
      .limit(1);

    const nextPosition = lastStop && lastStop.length > 0 ? lastStop[0].position + 1 : 0;

    const { data: stop, error } = await service
      .from("tour_stops")
      .insert({
        tour_day_id: dayId,
        college_id: collegeId,
        position: nextPosition,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(
      {
        id: stop.id,
        tourDayId: stop.tour_day_id,
        collegeId: stop.college_id,
        position: stop.position,
        visitTime: stop.visit_time,
        notes: stop.notes,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding stop:", error);
    return NextResponse.json(
      { error: "Failed to add stop" },
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

    const { stops } = await request.json();

    if (!Array.isArray(stops)) {
      return NextResponse.json(
        { error: "stops array is required" },
        { status: 400 }
      );
    }

    // Bulk reorder/move stops
    for (const item of stops) {
      const updates: Record<string, unknown> = {
        position: item.position,
        updated_at: new Date().toISOString(),
      };
      if (item.tourDayId !== undefined) updates.tour_day_id = item.tourDayId;
      if (item.visitTime !== undefined) updates.visit_time = item.visitTime;
      if (item.notes !== undefined) updates.notes = item.notes;

      const { error } = await service
        .from("tour_stops")
        .update(updates)
        .eq("id", item.id);

      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reordering stops:", error);
    return NextResponse.json(
      { error: "Failed to reorder stops" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const stopId = request.nextUrl.searchParams.get("stopId");
    if (!stopId) {
      return NextResponse.json(
        { error: "stopId query parameter is required" },
        { status: 400 }
      );
    }

    const { error } = await service
      .from("tour_stops")
      .delete()
      .eq("id", stopId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing stop:", error);
    return NextResponse.json(
      { error: "Failed to remove stop" },
      { status: 500 }
    );
  }
}
