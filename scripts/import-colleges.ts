/**
 * Import college data from the College Scorecard API into Supabase.
 *
 * Fetches ~5,000 degree-granting institutions with key metrics
 * (enrollment, tuition, acceptance rate, test scores, etc.)
 * and inserts them into the colleges table.
 *
 * Prerequisites:
 *   - Schema already applied (colleges table exists)
 *   - .env.local contains: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SCORECARD_API_KEY
 *
 * Usage:
 *   npx tsx scripts/import-colleges.ts
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SCORECARD_API_KEY = process.env.SCORECARD_API_KEY!;
const SCORECARD_API =
  "https://api.data.gov/ed/collegescorecard/v1/schools.json";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !SCORECARD_API_KEY) {
  console.error("Missing required environment variables.");
  console.error(
    "Ensure .env.local contains: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SCORECARD_API_KEY"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Fields to request from College Scorecard API
const SCORECARD_FIELDS = [
  "id",
  "school.name",
  "school.city",
  "school.state",
  "school.zip",
  "school.school_url",
  "school.region_id",
  "school.ownership",
  "school.degrees_awarded.predominant",
  "school.price_calculator_url",
  "latest.student.size",
  "latest.cost.tuition.in_state",
  "latest.cost.tuition.out_of_state",
  "latest.cost.avg_net_price.overall",
  "latest.admissions.admission_rate.overall",
  "latest.admissions.sat_scores.midpoint.math",
  "latest.admissions.sat_scores.midpoint.critical_reading",
  "latest.admissions.act_scores.midpoint.cumulative",
  "latest.completion.completion_rate_4yr_150nt",
  "location.lat",
  "location.lon",
].join(",");

// Scorecard region_id → our region names
const REGION_MAP: Record<number, string> = {
  1: "New England",
  2: "Mid-Atlantic",
  3: "Midwest",
  4: "Midwest",
  5: "Southeast",
  6: "Southwest",
  7: "Mountain",
  8: "Pacific",
};

// Determine college type from ownership + predominant degree
function getCollegeType(ownership: number, predominantDegree: number): string {
  if (ownership === 1 && predominantDegree <= 2) return "Community College";
  if (ownership === 1) return "Public";
  return "Private";
}

// Determine size category from enrollment
function getSizeCategory(enrollment: number | null): string | null {
  if (enrollment == null) return null;
  if (enrollment < 5000) return "Small";
  if (enrollment <= 15000) return "Medium";
  return "Large";
}

// The 27 Jesuit colleges/universities in the US (matched by name)
const JESUIT_COLLEGES = new Set([
  "Boston College",
  "Canisius University",
  "Canisius College",
  "College of the Holy Cross",
  "Creighton University",
  "Fairfield University",
  "Fordham University",
  "Georgetown University",
  "Gonzaga University",
  "John Carroll University",
  "Le Moyne University",
  "Le Moyne College",
  "Loyola Marymount University",
  "Loyola University Chicago",
  "Loyola University Maryland",
  "Loyola University New Orleans",
  "Marquette University",
  "Regis University",
  "Rockhurst University",
  "Saint Joseph's University",
  "Saint Louis University",
  "Saint Peter's University",
  "Santa Clara University",
  "Seattle University",
  "Spring Hill College",
  "University of Detroit Mercy",
  "University of San Francisco",
  "University of Scranton",
  "Xavier University",
]);

interface ScorecardSchool {
  id: number;
  "school.name": string;
  "school.city": string;
  "school.state": string;
  "school.zip": string | null;
  "school.school_url": string | null;
  "school.region_id": number;
  "school.ownership": number;
  "school.degrees_awarded.predominant": number;
  "school.price_calculator_url": string | null;
  "latest.student.size": number | null;
  "latest.cost.tuition.in_state": number | null;
  "latest.cost.tuition.out_of_state": number | null;
  "latest.cost.avg_net_price.overall": number | null;
  "latest.admissions.admission_rate.overall": number | null;
  "latest.admissions.sat_scores.midpoint.math": number | null;
  "latest.admissions.sat_scores.midpoint.critical_reading": number | null;
  "latest.admissions.act_scores.midpoint.cumulative": number | null;
  "latest.completion.completion_rate_4yr_150nt": number | null;
  "location.lat": number | null;
  "location.lon": number | null;
}

function mapToCollegeRow(school: ScorecardSchool) {
  const name = school["school.name"];
  const enrollment = school["latest.student.size"];
  const admissionRate =
    school["latest.admissions.admission_rate.overall"] != null
      ? Math.round(school["latest.admissions.admission_rate.overall"] * 10000) /
        100
      : null;
  const gradRate =
    school["latest.completion.completion_rate_4yr_150nt"] != null
      ? Math.round(
          school["latest.completion.completion_rate_4yr_150nt"] * 10000
        ) / 100
      : null;

  // Clean up website URL
  let website = school["school.school_url"];
  if (website && !website.startsWith("http")) {
    website = "https://" + website;
  }

  return {
    name,
    city: school["school.city"],
    state: school["school.state"],
    zip_code: school["school.zip"],
    website,
    region: REGION_MAP[school["school.region_id"]] || null,
    type: getCollegeType(
      school["school.ownership"],
      school["school.degrees_awarded.predominant"]
    ),
    size: getSizeCategory(enrollment),
    enrollment,
    tuition_in_state: school["latest.cost.tuition.in_state"],
    tuition_out_of_state: school["latest.cost.tuition.out_of_state"],
    net_cost: school["latest.cost.avg_net_price.overall"],
    net_pricing_guidance: school["school.price_calculator_url"] || null,
    acceptance_rate: admissionRate,
    sat_math: school["latest.admissions.sat_scores.midpoint.math"],
    sat_reading:
      school["latest.admissions.sat_scores.midpoint.critical_reading"],
    act_composite:
      school["latest.admissions.act_scores.midpoint.cumulative"],
    graduation_rate: gradRate,
    jesuit: JESUIT_COLLEGES.has(name),
    scorecard_id: String(school.id),
    latitude: school["location.lat"],
    longitude: school["location.lon"],
  };
}

async function fetchPage(
  page: number,
  perPage: number
): Promise<{ results: ScorecardSchool[]; total: number }> {
  const url = new URL(SCORECARD_API);
  url.searchParams.set("api_key", SCORECARD_API_KEY);
  url.searchParams.set("fields", SCORECARD_FIELDS);
  url.searchParams.set("per_page", String(perPage));
  url.searchParams.set("page", String(page));
  // Only currently operating, degree-granting institutions
  url.searchParams.set("school.operating", "1");
  url.searchParams.set("school.degrees_awarded.predominant__range", "2..4");

  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Scorecard API error ${res.status}: ${text}`);
  }
  const data = await res.json();
  return {
    results: data.results || [],
    total: data.metadata?.total || 0,
  };
}

async function main() {
  console.log("Checking Supabase connection...");
  const { count: existingCount } = await supabase
    .from("colleges")
    .select("*", { count: "exact", head: true });

  if (existingCount && existingCount > 0) {
    console.error(
      `colleges table already has ${existingCount} rows. Aborting to prevent duplicates.`
    );
    console.error(
      "If you want to re-import, truncate the table first: TRUNCATE colleges CASCADE;"
    );
    process.exit(1);
  }

  console.log("Fetching colleges from College Scorecard API...\n");

  const PER_PAGE = 100;
  let page = 0;
  let total = 0;
  let fetched = 0;
  let inserted = 0;
  let jesuitCount = 0;

  // Fetch first page to get total count
  const firstPage = await fetchPage(page, PER_PAGE);
  total = firstPage.total;
  console.log(`Total institutions matching filters: ${total}\n`);

  let allResults = firstPage.results;
  fetched += firstPage.results.length;

  // Fetch remaining pages
  while (fetched < total) {
    page++;
    await new Promise((r) => setTimeout(r, 200)); // rate limit
    const { results } = await fetchPage(page, PER_PAGE);
    if (results.length === 0) break;
    allResults = allResults.concat(results);
    fetched += results.length;
    process.stdout.write(
      `\rFetched ${fetched}/${total} from Scorecard API...`
    );
  }
  console.log(`\nFetched ${allResults.length} institutions total.`);

  // Map to our schema
  const rows = allResults.map(mapToCollegeRow);

  // Count Jesuit colleges found
  jesuitCount = rows.filter((r) => r.jesuit).length;
  console.log(`Identified ${jesuitCount} Jesuit colleges.`);

  // Insert in batches
  const BATCH_SIZE = 100;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("colleges").insert(batch);

    if (error) {
      console.error(
        `\nError inserting batch ${Math.floor(i / BATCH_SIZE) + 1}:`,
        error.message
      );
      // Try individual inserts for this batch to identify the problem row
      for (const row of batch) {
        const { error: rowError } = await supabase
          .from("colleges")
          .insert(row);
        if (rowError) {
          console.error(`  Failed: ${row.name} — ${rowError.message}`);
        } else {
          inserted++;
        }
      }
    } else {
      inserted += batch.length;
    }

    process.stdout.write(
      `\rInserted ${inserted}/${rows.length} into Supabase...`
    );
  }

  console.log(`\n\nDone!`);
  console.log(`Inserted: ${inserted} colleges`);
  console.log(`Jesuit: ${jesuitCount}`);

  // Verify
  const { count } = await supabase
    .from("colleges")
    .select("*", { count: "exact", head: true });
  console.log(`Total in database: ${count}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
