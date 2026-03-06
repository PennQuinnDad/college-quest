import type { College } from "@/lib/types";

/**
 * Maps a raw Supabase college row (snake_case) to the camelCase College interface.
 * Used in API routes so all consumers receive consistent camelCase data.
 */
export function mapCollegeRow(raw: Record<string, unknown>): College {
  return {
    id: raw.id as string,
    name: raw.name as string,
    city: raw.city as string,
    state: raw.state as string,
    zipCode: (raw.zip_code ?? null) as string | null,
    website: (raw.website ?? null) as string | null,
    region: (raw.region ?? null) as string | null,
    category: (raw.category ?? null) as string | null,
    type: (raw.type ?? null) as string | null,
    size: (raw.size ?? null) as string | null,
    enrollment: (raw.enrollment ?? null) as number | null,
    tuitionInState: (raw.tuition_in_state ?? null) as number | null,
    tuitionOutOfState: (raw.tuition_out_of_state ?? null) as number | null,
    netCost: (raw.net_cost ?? null) as number | null,
    netPricingGuidance: (raw.net_pricing_guidance ?? null) as string | null,
    acceptanceRate: (raw.acceptance_rate ?? null) as number | null,
    satMath: (raw.sat_math ?? null) as number | null,
    satReading: (raw.sat_reading ?? null) as number | null,
    actComposite: (raw.act_composite ?? null) as number | null,
    graduationRate: (raw.graduation_rate ?? null) as number | null,
    programs: (raw.programs ?? null) as string[] | null,
    description: (raw.description ?? null) as string | null,
    imageUrl: (raw.image_url ?? null) as string | null,
    jesuit: (raw.jesuit ?? false) as boolean,
    scorecardId: (raw.scorecard_id ?? null) as string | null,
    latitude: (raw.latitude ?? null) as number | null,
    longitude: (raw.longitude ?? null) as number | null,
    createdAt: raw.created_at as string,
    updatedAt: raw.updated_at as string,
  };
}
