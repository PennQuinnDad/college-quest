import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

// Haversine distance in miles between two lat/lng points
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface CollegeGeo {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
}

// Group colleges into days by geographic proximity
function autoGroupColleges(colleges: CollegeGeo[]): CollegeGeo[][] {
  const located = colleges.filter((c) => c.latitude != null && c.longitude != null);
  const unlocated = colleges.filter((c) => c.latitude == null || c.longitude == null);

  // Sort by state then latitude (north → south)
  located.sort((a, b) => {
    const stateCompare = (a.state || "").localeCompare(b.state || "");
    if (stateCompare !== 0) return stateCompare;
    return (b.latitude || 0) - (a.latitude || 0);
  });

  const days: CollegeGeo[][] = [];
  const assigned = new Set<string>();

  for (const college of located) {
    if (assigned.has(college.id)) continue;

    const day: CollegeGeo[] = [college];
    assigned.add(college.id);

    // Find nearby unassigned colleges
    for (const other of located) {
      if (assigned.has(other.id)) continue;
      if (day.length >= 4) break;

      // Check distance to all colleges already in this day
      const closeEnough = day.every(
        (d) =>
          haversineDistance(
            d.latitude!,
            d.longitude!,
            other.latitude!,
            other.longitude!
          ) <= 80
      );

      if (closeEnough) {
        day.push(other);
        assigned.add(other.id);
      }
    }

    days.push(day);
  }

  // Add unlocated colleges as a separate day if any
  if (unlocated.length > 0) {
    days.push(unlocated);
  }

  return days;
}

// Generate a day title from the colleges in that day
function generateDayTitle(colleges: CollegeGeo[]): string {
  const cities = [...new Set(colleges.map((c) => c.city).filter(Boolean))];
  if (cities.length === 0) return "College Visits";
  if (cities.length <= 2) return cities.join(" + ");
  return `${cities[0]} + ${cities.length - 1} more`;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const service = createServiceClient();

    // Get tours with day/stop counts
    const { data: tours, error } = await service
      .from("tours")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Get day counts and stop counts for each tour
    const tourSummaries = await Promise.all(
      (tours || []).map(async (tour) => {
        const { data: days } = await service
          .from("tour_days")
          .select("id")
          .eq("tour_id", tour.id);

        const dayIds = (days || []).map((d) => d.id);
        let stopCount = 0;
        const stateSet = new Set<string>();

        if (dayIds.length > 0) {
          const { data: stops } = await service
            .from("tour_stops")
            .select("college_id")
            .in("tour_day_id", dayIds);

          stopCount = (stops || []).length;

          if (stops && stops.length > 0) {
            const collegeIds = stops.map((s) => s.college_id);
            const { data: colleges } = await service
              .from("colleges")
              .select("state")
              .in("id", collegeIds);

            for (const c of colleges || []) {
              if (c.state) stateSet.add(c.state);
            }
          }
        }

        return {
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
          dayCount: dayIds.length,
          stopCount,
          states: [...stateSet].sort(),
        };
      })
    );

    return NextResponse.json({ tours: tourSummaries });
  } catch (error) {
    console.error("Error fetching tours:", error);
    return NextResponse.json(
      { error: "Failed to fetch tours" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      name,
      collegeIds,
      startLocation,
      startLatitude,
      startLongitude,
      endLocation,
      endLatitude,
      endLongitude,
    } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Tour name is required" },
        { status: 400 }
      );
    }

    if (!collegeIds || !Array.isArray(collegeIds) || collegeIds.length === 0) {
      return NextResponse.json(
        { error: "At least one college is required" },
        { status: 400 }
      );
    }

    const service = createServiceClient();

    // Check tour count
    const { count } = await service
      .from("tours")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (count && count >= 20) {
      return NextResponse.json(
        { error: "Maximum of 20 tours allowed" },
        { status: 400 }
      );
    }

    // Fetch college data for auto-grouping
    const { data: colleges, error: collegeError } = await service
      .from("colleges")
      .select("id, name, city, state, latitude, longitude")
      .in("id", collegeIds);

    if (collegeError) throw collegeError;
    if (!colleges || colleges.length === 0) {
      return NextResponse.json(
        { error: "No valid colleges found" },
        { status: 400 }
      );
    }

    // Create the tour
    const { data: tour, error: tourError } = await service
      .from("tours")
      .insert({
        user_id: user.id,
        name: name.trim(),
      })
      .select()
      .single();

    if (tourError) throw tourError;

    // Auto-group colleges into days
    const dayGroups = autoGroupColleges(colleges as CollegeGeo[]);

    // Create days and stops
    for (let dayIndex = 0; dayIndex < dayGroups.length; dayIndex++) {
      const group = dayGroups[dayIndex];
      const title = generateDayTitle(group);

      const dayInsert: Record<string, unknown> = {
        tour_id: tour.id,
        position: dayIndex,
        title,
      };

      // Apply optional starting/ending locations to every day
      if (startLocation) dayInsert.start_location = startLocation;
      if (startLatitude != null) dayInsert.start_latitude = startLatitude;
      if (startLongitude != null) dayInsert.start_longitude = startLongitude;
      if (endLocation) dayInsert.end_location = endLocation;
      if (endLatitude != null) dayInsert.end_latitude = endLatitude;
      if (endLongitude != null) dayInsert.end_longitude = endLongitude;

      const { data: day, error: dayError } = await service
        .from("tour_days")
        .insert(dayInsert)
        .select()
        .single();

      if (dayError) throw dayError;

      // Create stops for this day
      const stopInserts = group.map((college, stopIndex) => ({
        tour_day_id: day.id,
        college_id: college.id,
        position: stopIndex,
      }));

      const { error: stopsError } = await service
        .from("tour_stops")
        .insert(stopInserts);

      if (stopsError) throw stopsError;
    }

    return NextResponse.json({ id: tour.id }, { status: 201 });
  } catch (error) {
    console.error("Error creating tour:", error);
    return NextResponse.json(
      { error: "Failed to create tour" },
      { status: 500 }
    );
  }
}
