import type { College, UserProfile } from "@/lib/types";

export function makeCollege(overrides: Partial<College> = {}): College {
  return {
    id: "c-1",
    name: "Massachusetts Institute of Technology",
    city: "Cambridge",
    state: "MA",
    zipCode: "02139",
    website: "https://mit.edu",
    region: "Northeast",
    category: "Research University",
    type: "Private",
    size: "Medium",
    enrollment: 11520,
    tuitionInState: 57590,
    tuitionOutOfState: 57590,
    netCost: 21680,
    netPricingGuidance: null,
    acceptanceRate: 3.96,
    satMath: 790,
    satReading: 750,
    actComposite: 36,
    graduationRate: 95,
    programs: ["Computer Science", "Engineering", "Mathematics"],
    description: "A private research university in Cambridge, Massachusetts.",
    imageUrl: null,
    jesuit: false,
    scorecardId: "166683",
    latitude: 42.3601,
    longitude: -71.0942,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

export function makeUser(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: "u-1",
    email: "user@test.com",
    displayName: "Test User",
    role: "user",
    accountType: "student",
    graduationYear: 2027,
    highSchool: "Test High",
    profileCompleted: true,
    avatarUrl: null,
    ...overrides,
  };
}
