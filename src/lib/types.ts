export interface College {
  id: string;
  name: string;
  city: string;
  state: string;
  zipCode: string | null;
  website: string | null;
  region: string | null;
  category: string | null;
  type: string | null;
  size: string | null;
  enrollment: number | null;
  tuitionInState: number | null;
  tuitionOutOfState: number | null;
  netCost: number | null;
  netPricingGuidance: string | null;
  acceptanceRate: number | null;
  satMath: number | null;
  satReading: number | null;
  actComposite: number | null;
  graduationRate: number | null;
  programs: string[] | null;
  description: string | null;
  imageUrl: string | null;
  jesuit: boolean;
  scorecardId: string | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface School {
  id: string;
  name: string;
  collegeId: string;
  collegeName: string | null;
  collegeCity: string | null;
  collegeState: string | null;
  category: string | null;
  cipCode: string | null;
  website: string | null;
  description: string | null;
  source: "manual" | "enriched";
  createdAt: string;
  updatedAt: string;
}

export interface Folder {
  id: string;
  name: string;
  color: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
}

export interface CollegeSearchParams {
  query?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  states?: string;
  regions?: string;
  types?: string;
  sizes?: string;
  favoriteIds?: string;
  acceptanceRateMin?: number;
  acceptanceRateMax?: number;
  acceptanceRanges?: string;
  tuitionMin?: number;
  tuitionMax?: number;
  enrollmentMin?: number;
  enrollmentMax?: number;
  jesuitOnly?: string;
  programCategories?: string;
}

export type ViewMode = "table" | "grid" | "list" | "map";

export interface SavedFilter {
  id: string;
  name: string;
  params: CollegeSearchParams;
}
