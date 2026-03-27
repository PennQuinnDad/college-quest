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
  sharedWithFamily: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
  accountType: "student" | "parent";
  graduationYear: number | null;
  highSchool: string | null;
  profileCompleted: boolean;
  avatarUrl: string | null;
}

export interface FamilyLink {
  id: string;
  parentId: string;
  studentId: string;
  status: "pending" | "active" | "revoked";
  canViewFavorites: boolean;
  canViewFolders: boolean;
  canViewActivity: boolean;
  createdAt: string;
  acceptedAt: string | null;
}

export interface FamilyMember {
  linkId: string;
  accountType: "student" | "parent";
  id: string;
  displayName: string | null;
  email: string;
  avatarUrl: string | null;
  graduationYear: number | null;
  highSchool: string | null;
  lastActiveAt: string | null;
  canViewFavorites: boolean;
  canViewFolders: boolean;
  canViewActivity: boolean;
  status: "pending" | "active" | "revoked";
}

export interface CollegeNote {
  id: string;
  collegeId: string;
  userId: string;
  userName: string | null;
  content: string;
  visibility: "private" | "family";
  createdAt: string;
  updatedAt: string;
}

export interface FamilyInvite {
  id: string;
  inviterId: string;
  inviterType: "parent" | "student";
  inviterName: string | null;
  invitedEmail: string;
  token: string;
  expiresAt: string;
  claimed: boolean;
  createdAt: string;
}

export interface StudentSummary {
  id: string;
  displayName: string | null;
  email: string;
  graduationYear: number | null;
  highSchool: string | null;
  lastActiveAt: string | null;
  favoriteCount: number;
  folderCount: number;
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

export interface CollegeResource {
  id: string;
  collegeId: string;
  type: "link" | "file";
  title: string;
  description: string | null;
  category: string | null;
  url: string | null;
  storagePath: string | null;
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export type ViewMode = "table" | "grid" | "list" | "map";

export interface SavedFilter {
  id: string;
  name: string;
  params: CollegeSearchParams;
}

export type ApplicationStatus =
  | "researching"
  | "applying"
  | "applied"
  | "accepted"
  | "rejected"
  | "waitlisted"
  | "deferred"
  | "enrolled"
  | "withdrawn";

export type ApplicationType =
  | "early_decision"
  | "early_action"
  | "regular"
  | "rolling";

export interface CollegeApplication {
  id: string;
  userId: string;
  collegeId: string;
  collegeName: string | null;
  collegeCity: string | null;
  collegeState: string | null;
  status: ApplicationStatus;
  applicationType: ApplicationType | null;
  deadline: string | null;
  submittedAt: string | null;
  decisionAt: string | null;
  notes: string | null;
  sharedWithFamily: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ActivityAction =
  | "favorited_college"
  | "unfavorited_college"
  | "added_note"
  | "updated_application"
  | "added_to_folder"
  | "created_folder"
  | "accepted_suggestion";

export interface ActivityEvent {
  id: string;
  userId: string;
  userName: string | null;
  action: ActivityAction;
  collegeId: string | null;
  collegeName: string | null;
  metadata: Record<string, unknown>;
  visibility: "family" | "private";
  createdAt: string;
}

export interface CollegeSuggestion {
  id: string;
  collegeId: string;
  collegeName: string | null;
  collegeCity: string | null;
  collegeState: string | null;
  fromUserId: string;
  fromUserName: string | null;
  toUserId: string;
  note: string | null;
  status: "pending" | "accepted" | "dismissed";
  createdAt: string;
}

// Campus Tours
export interface Tour {
  id: string;
  userId: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  travelNotes: string | null;
  sharedWithFamily: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TourDay {
  id: string;
  tourId: string;
  position: number;
  title: string | null;
  date: string | null;
  notes: string | null;
  startLocation: string | null;
  startTravelMin: number | null;
  endLocation: string | null;
  endTravelMin: number | null;
  departureTime: number | null;
  startLatitude: number | null;
  startLongitude: number | null;
  endLatitude: number | null;
  endLongitude: number | null;
}

export interface TourStop {
  id: string;
  tourDayId: string;
  collegeId: string;
  position: number;
  visitTime: string | null;
  notes: string | null;
}

export interface TourStopWithCollege extends TourStop {
  college: College;
}

export interface TourDayWithStops extends TourDay {
  stops: TourStopWithCollege[];
}

export interface TourWithDays extends Tour {
  days: TourDayWithStops[];
}

export interface TourSummary extends Tour {
  dayCount: number;
  stopCount: number;
  states: string[];
}
