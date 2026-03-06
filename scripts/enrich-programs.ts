/**
 * Enrich colleges with program data from College Scorecard API.
 *
 * Fetches program percentage fields for each college and:
 * 1. Populates the `programs` TEXT[] column on colleges
 * 2. Creates entries in the `schools` table with categories
 *
 * Usage:
 *   npx tsx scripts/enrich-programs.ts
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
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Scorecard program percentage fields → readable program names + categories
const PROGRAM_FIELDS: {
  field: string;
  name: string;
  category: string;
}[] = [
  { field: "latest.academics.program_percentage.agriculture", name: "Agriculture", category: "Agriculture & Natural Resources" },
  { field: "latest.academics.program_percentage.resources", name: "Natural Resources & Conservation", category: "Agriculture & Natural Resources" },
  { field: "latest.academics.program_percentage.architecture", name: "Architecture", category: "Arts & Design" },
  { field: "latest.academics.program_percentage.ethnic_cultural_gender", name: "Ethnic, Cultural & Gender Studies", category: "Humanities & Social Sciences" },
  { field: "latest.academics.program_percentage.communication", name: "Communication & Journalism", category: "Arts & Design" },
  { field: "latest.academics.program_percentage.communications_technology", name: "Communications Technology", category: "Technology" },
  { field: "latest.academics.program_percentage.computer", name: "Computer Science & IT", category: "Technology" },
  { field: "latest.academics.program_percentage.personal_culinary", name: "Culinary Arts & Personal Services", category: "Vocational & Technical" },
  { field: "latest.academics.program_percentage.education", name: "Education", category: "Education" },
  { field: "latest.academics.program_percentage.engineering", name: "Engineering", category: "Engineering" },
  { field: "latest.academics.program_percentage.engineering_technology", name: "Engineering Technology", category: "Engineering" },
  { field: "latest.academics.program_percentage.language", name: "Foreign Languages & Linguistics", category: "Humanities & Social Sciences" },
  { field: "latest.academics.program_percentage.family_consumer_science", name: "Family & Consumer Sciences", category: "Health & Human Services" },
  { field: "latest.academics.program_percentage.legal", name: "Legal Studies", category: "Law & Public Policy" },
  { field: "latest.academics.program_percentage.english", name: "English Language & Literature", category: "Humanities & Social Sciences" },
  { field: "latest.academics.program_percentage.humanities", name: "Liberal Arts & Humanities", category: "Humanities & Social Sciences" },
  { field: "latest.academics.program_percentage.library", name: "Library Science", category: "Education" },
  { field: "latest.academics.program_percentage.biological", name: "Biological Sciences", category: "Science" },
  { field: "latest.academics.program_percentage.mathematics", name: "Mathematics & Statistics", category: "Science" },
  { field: "latest.academics.program_percentage.military", name: "Military Science", category: "Law & Public Policy" },
  { field: "latest.academics.program_percentage.multidiscipline", name: "Interdisciplinary Studies", category: "Humanities & Social Sciences" },
  { field: "latest.academics.program_percentage.parks_recreation_fitness", name: "Parks, Recreation & Fitness", category: "Health & Human Services" },
  { field: "latest.academics.program_percentage.philosophy_religious", name: "Philosophy & Religious Studies", category: "Humanities & Social Sciences" },
  { field: "latest.academics.program_percentage.theology_religious_vocation", name: "Theology & Ministry", category: "Humanities & Social Sciences" },
  { field: "latest.academics.program_percentage.physical_science", name: "Physical Sciences", category: "Science" },
  { field: "latest.academics.program_percentage.science_technology", name: "Science Technologies", category: "Science" },
  { field: "latest.academics.program_percentage.psychology", name: "Psychology", category: "Health & Human Services" },
  { field: "latest.academics.program_percentage.security_law_enforcement", name: "Criminal Justice & Law Enforcement", category: "Law & Public Policy" },
  { field: "latest.academics.program_percentage.public_administration_social_service", name: "Public Administration & Social Work", category: "Law & Public Policy" },
  { field: "latest.academics.program_percentage.social_science", name: "Social Sciences", category: "Humanities & Social Sciences" },
  { field: "latest.academics.program_percentage.construction", name: "Construction Trades", category: "Vocational & Technical" },
  { field: "latest.academics.program_percentage.mechanic_repair_technology", name: "Mechanics & Repair", category: "Vocational & Technical" },
  { field: "latest.academics.program_percentage.precision_production", name: "Precision Production", category: "Vocational & Technical" },
  { field: "latest.academics.program_percentage.transportation", name: "Transportation & Logistics", category: "Vocational & Technical" },
  { field: "latest.academics.program_percentage.visual_performing", name: "Visual & Performing Arts", category: "Arts & Design" },
  { field: "latest.academics.program_percentage.health", name: "Health Professions", category: "Health & Human Services" },
  { field: "latest.academics.program_percentage.business_marketing", name: "Business & Marketing", category: "Business" },
];

const FIELDS_CSV =
  "id,school.name," + PROGRAM_FIELDS.map((p) => p.field).join(",");

async function fetchPage(page: number): Promise<{ results: any[]; total: number }> {
  const url = new URL(SCORECARD_API);
  url.searchParams.set("api_key", SCORECARD_API_KEY);
  url.searchParams.set("fields", FIELDS_CSV);
  url.searchParams.set("per_page", "100");
  url.searchParams.set("page", String(page));
  url.searchParams.set("school.operating", "1");
  url.searchParams.set("school.degrees_awarded.predominant__range", "1..4");
  url.searchParams.set("school.ownership__range", "1..2");

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return { results: data.results || [], total: data.metadata?.total || 0 };
}

async function main() {
  // Build scorecard_id → college_id lookup
  console.log("Building college ID lookup...");
  const lookup = new Map<string, string>();
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from("colleges")
      .select("id, scorecard_id")
      .not("scorecard_id", "is", null)
      .range(offset, offset + 999);
    if (error) throw error;
    if (!data?.length) break;
    for (const c of data) lookup.set(c.scorecard_id, c.id);
    if (data.length < 1000) break;
    offset += 1000;
  }
  console.log(`Loaded ${lookup.size} college IDs.\n`);

  // Fetch program data from Scorecard
  console.log("Fetching program data from Scorecard API...");
  let page = 0;
  let all: any[] = [];
  const first = await fetchPage(0);
  const total = first.total;
  all = first.results;
  console.log(`Total: ${total}`);

  while (all.length < total) {
    page++;
    await new Promise((r) => setTimeout(r, 200));
    const { results } = await fetchPage(page);
    if (!results.length) break;
    all.push(...results);
    process.stdout.write(`\rFetched ${all.length}/${total}...`);
  }
  console.log(`\nFetched ${all.length} records.\n`);

  // Process each college
  let updatedPrograms = 0;
  let schoolsCreated = 0;
  const schoolRows: any[] = [];

  for (const school of all) {
    const scorecardId = String(school.id);
    const collegeId = lookup.get(scorecardId);
    if (!collegeId) continue;

    const programs: string[] = [];
    for (const pf of PROGRAM_FIELDS) {
      const pct = school[pf.field];
      if (pct != null && pct > 0) {
        programs.push(pf.name);
        schoolRows.push({
          college_id: collegeId,
          name: pf.name,
          category: pf.category,
          source: "enriched",
        });
      }
    }

    if (programs.length > 0) {
      const { error } = await supabase
        .from("colleges")
        .update({ programs })
        .eq("id", collegeId);
      if (error) {
        console.error(`Failed to update programs for ${school["school.name"]}: ${error.message}`);
      } else {
        updatedPrograms++;
      }
    }

    if (updatedPrograms % 100 === 0 && updatedPrograms > 0) {
      process.stdout.write(`\rUpdated ${updatedPrograms} college programs...`);
    }
  }
  console.log(`\nUpdated programs for ${updatedPrograms} colleges.`);

  // Insert schools in batches
  console.log(`\nInserting ${schoolRows.length} school/program entries...`);
  for (let i = 0; i < schoolRows.length; i += 100) {
    const batch = schoolRows.slice(i, i + 100);
    const { error } = await supabase.from("schools").insert(batch);
    if (error) {
      console.error(`Batch insert error at ${i}: ${error.message}`);
      // Try individual inserts
      for (const row of batch) {
        const { error: e2 } = await supabase.from("schools").insert(row);
        if (!e2) schoolsCreated++;
        else console.error(`  Failed: ${row.name} at ${row.college_id}: ${e2.message}`);
      }
    } else {
      schoolsCreated += batch.length;
    }
    process.stdout.write(`\rInserted ${schoolsCreated}/${schoolRows.length} schools...`);
  }

  console.log(`\n\nDone!`);
  console.log(`Colleges with programs: ${updatedPrograms}`);
  console.log(`School entries created: ${schoolsCreated}`);

  // Final counts
  const { count: schoolCount } = await supabase
    .from("schools")
    .select("*", { count: "exact", head: true });
  const { count: withPrograms } = await supabase
    .from("colleges")
    .select("*", { count: "exact", head: true })
    .not("programs", "is", null);
  console.log(`Total schools in DB: ${schoolCount}`);
  console.log(`Colleges with programs: ${withPrograms}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
