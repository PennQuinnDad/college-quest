import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tourId: string; dayId: string }> }
) {
  try {
    const { tourId, dayId } = await params;
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

    const body = await request.json();
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.title !== undefined) updates.title = body.title;
    if (body.date !== undefined) updates.date = body.date;
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.startLocation !== undefined) updates.start_location = body.startLocation;
    if (body.startTravelMin !== undefined) updates.start_travel_min = body.startTravelMin;
    if (body.endLocation !== undefined) updates.end_location = body.endLocation;
    if (body.endTravelMin !== undefined) updates.end_travel_min = body.endTravelMin;
    if (body.departureTime !== undefined) updates.departure_time = body.departureTime;
    if (body.startLatitude !== undefined) updates.start_latitude = body.startLatitude;
    if (body.startLongitude !== undefined) updates.start_longitude = body.startLongitude;
    if (body.endLatitude !== undefined) updates.end_latitude = body.endLatitude;
    if (body.endLongitude !== undefined) updates.end_longitude = body.endLongitude;

    const { error } = await service
      .from("tour_days")
      .update(updates)
      .eq("id", dayId)
      .eq("tour_id", tourId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating day:", error);
    return NextResponse.json(
      { error: "Failed to update day" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ tourId: string; dayId: string }> }
) {
  try {
    const { tourId, dayId } = await params;
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

    const { error } = await service
      .from("tour_days")
      .delete()
      .eq("id", dayId)
      .eq("tour_id", tourId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting day:", error);
    return NextResponse.json(
      { error: "Failed to delete day" },
      { status: 500 }
    );
  }
}
