import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
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

    // Get tour
    const { data: tour, error: tourError } = await service
      .from("tours")
      .select("*")
      .eq("id", tourId)
      .eq("user_id", user.id)
      .single();

    if (tourError || !tour) {
      return NextResponse.json({ error: "Tour not found" }, { status: 404 });
    }

    // Get days ordered by position
    const { data: days, error: daysError } = await service
      .from("tour_days")
      .select("*")
      .eq("tour_id", tourId)
      .order("position", { ascending: true });

    if (daysError) throw daysError;

    // Get all stops for all days
    const dayIds = (days || []).map((d) => d.id);
    let stops: Record<string, unknown>[] = [];
    if (dayIds.length > 0) {
      const { data: stopsData, error: stopsError } = await service
        .from("tour_stops")
        .select("*")
        .in("tour_day_id", dayIds)
        .order("position", { ascending: true });

      if (stopsError) throw stopsError;
      stops = stopsData || [];
    }

    // Get all college data for stops
    const collegeIds = [...new Set(stops.map((s) => s.college_id as string))];
    let collegeMap: Record<string, Record<string, unknown>> = {};
    if (collegeIds.length > 0) {
      const { data: colleges, error: collegeError } = await service
        .from("colleges")
        .select("*")
        .in("id", collegeIds);

      if (collegeError) throw collegeError;
      collegeMap = Object.fromEntries(
        (colleges || []).map((c) => [c.id, c])
      );
    }

    // Assemble response
    const result = {
      id: tour.id,
      userId: tour.user_id,
      name: tour.name,
      startDate: tour.start_date,
      endDate: tour.end_date,
      notes: tour.notes,
      travelNotes: tour.travel_notes,
      sharedWithFamily: tour.shared_with_family,
      createdAt: tour.created_at,
      updatedAt: tour.updated_at,
      days: (days || []).map((day) => {
        const dayStops = stops
          .filter((s) => s.tour_day_id === day.id)
          .sort((a, b) => (a.position as number) - (b.position as number))
          .map((s) => {
            const college = collegeMap[s.college_id as string];
            return {
              id: s.id,
              tourDayId: s.tour_day_id,
              collegeId: s.college_id,
              position: s.position,
              visitTime: s.visit_time,
              notes: s.notes,
              college: college
                ? {
                    id: college.id,
                    name: college.name,
                    city: college.city,
                    state: college.state,
                    zipCode: college.zip_code,
                    website: college.website,
                    region: college.region,
                    category: college.category,
                    type: college.type,
                    size: college.size,
                    enrollment: college.enrollment,
                    tuitionInState: college.tuition_in_state,
                    tuitionOutOfState: college.tuition_out_of_state,
                    netCost: college.net_cost,
                    netPricingGuidance: college.net_pricing_guidance,
                    acceptanceRate: college.acceptance_rate,
                    satMath: college.sat_math,
                    satReading: college.sat_reading,
                    actComposite: college.act_composite,
                    graduationRate: college.graduation_rate,
                    programs: college.programs,
                    description: college.description,
                    imageUrl: college.image_url,
                    jesuit: college.jesuit,
                    scorecardId: college.scorecard_id,
                    latitude: college.latitude,
                    longitude: college.longitude,
                    createdAt: college.created_at,
                    updatedAt: college.updated_at,
                  }
                : null,
            };
          });

        return {
          id: day.id,
          tourId: day.tour_id,
          position: day.position,
          title: day.title,
          date: day.date,
          notes: day.notes,
          startLocation: day.start_location,
          startTravelMin: day.start_travel_min,
          endLocation: day.end_location,
          endTravelMin: day.end_travel_min,
          departureTime: day.departure_time,
          startLatitude: day.start_latitude,
          startLongitude: day.start_longitude,
          endLatitude: day.end_latitude,
          endLongitude: day.end_longitude,
          stops: dayStops,
        };
      }),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching tour:", error);
    return NextResponse.json(
      { error: "Failed to fetch tour" },
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

    const body = await request.json();
    const service = createServiceClient();

    // Verify ownership
    const { data: existing } = await service
      .from("tours")
      .select("id")
      .eq("id", tourId)
      .eq("user_id", user.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Tour not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.startDate !== undefined) updates.start_date = body.startDate;
    if (body.endDate !== undefined) updates.end_date = body.endDate;
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.travelNotes !== undefined) updates.travel_notes = body.travelNotes;
    if (body.sharedWithFamily !== undefined) updates.shared_with_family = body.sharedWithFamily;

    const { error } = await service
      .from("tours")
      .update(updates)
      .eq("id", tourId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating tour:", error);
    return NextResponse.json(
      { error: "Failed to update tour" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
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

    // Verify ownership and delete
    const { error } = await service
      .from("tours")
      .delete()
      .eq("id", tourId)
      .eq("user_id", user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting tour:", error);
    return NextResponse.json(
      { error: "Failed to delete tour" },
      { status: 500 }
    );
  }
}
