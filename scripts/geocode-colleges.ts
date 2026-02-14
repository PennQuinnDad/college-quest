/**
 * One-time script to populate latitude/longitude for all colleges
 * using the College Scorecard API.
 *
 * Prerequisites:
 *   - Run this SQL in Supabase Dashboard first:
 *     ALTER TABLE colleges ADD COLUMN IF NOT EXISTS latitude float8,
 *                          ADD COLUMN IF NOT EXISTS longitude float8;
 *
 * Usage:
 *   npx tsx scripts/geocode-colleges.ts
 */

import { createClient } from "@supabase/supabase-js";

// Load env vars from .env.local when running standalone via tsx
import "dotenv/config";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SCORECARD_API_KEY = process.env.SCORECARD_API_KEY!;
const SCORECARD_API = "https://api.data.gov/ed/collegescorecard/v1/schools.json";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !SCORECARD_API_KEY) {
  console.error("Missing required environment variables.");
  console.error("Ensure .env.local contains: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SCORECARD_API_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface ScorecardResult {
  id: number;
  "school.name": string;
  "location.lat": number;
  "location.lon": number;
}

async function fetchScorecardBatch(ids: string[]): Promise<ScorecardResult[]> {
  const url = new URL(SCORECARD_API);
  url.searchParams.set("api_key", SCORECARD_API_KEY);
  url.searchParams.set("id", ids.join(","));
  url.searchParams.set("fields", "id,school.name,location.lat,location.lon");
  url.searchParams.set("per_page", "100");

  const res = await fetch(url.toString());
  if (!res.ok) {
    console.error(`Scorecard API error: ${res.status} ${res.statusText}`);
    return [];
  }
  const data = await res.json();
  return data.results || [];
}

async function main() {
  console.log("Fetching all colleges from Supabase...");

  // First verify the latitude column exists
  const { data: testRow, error: testErr } = await supabase
    .from("colleges")
    .select("id, latitude")
    .limit(1);

  if (testErr) {
    if (testErr.message.includes("latitude")) {
      console.error("ERROR: latitude column does not exist yet.");
      console.error("Please run this SQL in the Supabase SQL Editor:");
      console.error("  ALTER TABLE colleges ADD COLUMN IF NOT EXISTS latitude float8, ADD COLUMN IF NOT EXISTS longitude float8;");
      console.error("\nMake sure you're running it in the correct project (hawezgbaglrgjuczrqxu).");
      process.exit(1);
    }
    console.error("Error testing connection:", testErr.message);
    process.exit(1);
  }
  console.log("✓ latitude/longitude columns exist");

  // Paginate to get all colleges
  const allColleges: { id: string; scorecard_id: string | null; name: string; latitude: number | null }[] = [];
  const PAGE_SIZE = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("colleges")
      .select("id, scorecard_id, name, latitude")
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error("Error fetching colleges:", error.message);
      process.exit(1);
    }

    if (!data || data.length === 0) break;
    allColleges.push(...data);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  console.log(`Found ${allColleges.length} colleges total`);

  // Filter to those missing coordinates and having a scorecard_id
  const needsGeocode = allColleges.filter(
    (c) => c.latitude == null && c.scorecard_id
  );
  const alreadyGeocoded = allColleges.filter((c) => c.latitude != null);

  console.log(`Already geocoded: ${alreadyGeocoded.length}`);
  console.log(`Need geocoding (with scorecard_id): ${needsGeocode.length}`);
  console.log(
    `No scorecard_id: ${allColleges.filter((c) => !c.scorecard_id).length}`
  );

  if (needsGeocode.length === 0) {
    console.log("Nothing to geocode!");
    return;
  }

  // Batch fetch from College Scorecard API in groups of 100
  const BATCH_SIZE = 100;
  let updated = 0;
  let failed = 0;

  for (let i = 0; i < needsGeocode.length; i += BATCH_SIZE) {
    const batch = needsGeocode.slice(i, i + BATCH_SIZE);
    const scorecardIds = batch.map((c) => c.scorecard_id!);

    console.log(
      `Fetching batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(needsGeocode.length / BATCH_SIZE)} (${batch.length} colleges)...`
    );

    const results = await fetchScorecardBatch(scorecardIds);

    // Build lookup: scorecard_id -> { lat, lon }
    const lookup = new Map<string, { lat: number; lon: number }>();
    for (const r of results) {
      if (r["location.lat"] && r["location.lon"]) {
        lookup.set(String(r.id), {
          lat: r["location.lat"],
          lon: r["location.lon"],
        });
      }
    }

    // Update each college
    for (const college of batch) {
      const coords = lookup.get(String(college.scorecard_id!));
      if (coords) {
        const { error } = await supabase
          .from("colleges")
          .update({ latitude: coords.lat, longitude: coords.lon })
          .eq("id", college.id);

        if (error) {
          console.error(`Failed to update ${college.name}: ${error.message}`);
          failed++;
        } else {
          updated++;
        }
      } else {
        failed++;
      }
    }

    // Small delay to be polite to the API
    if (i + BATCH_SIZE < needsGeocode.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  console.log(`\nDone!`);
  console.log(`Updated: ${updated}`);
  console.log(`Failed/missing: ${failed}`);

  // Final count
  const { count } = await supabase
    .from("colleges")
    .select("*", { count: "exact", head: true })
    .not("latitude", "is", null);
  console.log(`Total colleges with coordinates: ${count}`);
}

main().catch(console.error);
