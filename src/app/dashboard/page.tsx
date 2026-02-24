"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-user";
import { FaIcon } from "@/components/ui/fa-icon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, formatPercent, formatCurrency } from "@/lib/utils";
import type { StudentSummary, ActivityEvent, CollegeApplication, ApplicationStatus } from "@/lib/types";

interface StudentFavoriteCollege {
  id: string;
  name: string;
  city: string;
  state: string;
  type: string | null;
  acceptanceRate: number | null;
  tuitionOutOfState: number | null;
  imageUrl: string | null;
}

interface StudentFolder {
  id: string;
  name: string;
  color: string | null;
  itemCount: number;
}

export default function DashboardPage() {
  const { data: user, isLoading: userLoading } = useUser();
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [pageLoadTime] = useState(() => Date.now());

  const isParent = user?.accountType === "parent";

  // ---- Fetch linked students (parent only) ----
  const { data: studentsData, isLoading: studentsLoading } = useQuery<{
    students: StudentSummary[];
  }>({
    queryKey: ["family-students"],
    queryFn: async () => {
      const res = await fetch("/api/family/students");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!user && isParent,
  });

  const students = studentsData?.students ?? [];
  const activeStudent = selectedStudentId
    ? students.find((s) => s.id === selectedStudentId)
    : students[0] ?? null;

  // ---- Fetch selected student's favorites ----
  const { data: favsData, isLoading: favsLoading } = useQuery<{
    colleges: StudentFavoriteCollege[];
  }>({
    queryKey: ["student-favorites", activeStudent?.id],
    queryFn: async () => {
      const res = await fetch(`/api/family/students/${activeStudent!.id}/favorites`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!activeStudent,
  });

  // ---- Fetch selected student's shared folders ----
  const { data: foldersData, isLoading: foldersLoading } = useQuery<{
    folders: StudentFolder[];
  }>({
    queryKey: ["student-folders", activeStudent?.id],
    queryFn: async () => {
      const res = await fetch(`/api/family/students/${activeStudent!.id}/folders`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!activeStudent,
  });

  // ---- Fetch selected student's activity ----
  const { data: activityData, isLoading: activityLoading } = useQuery<{
    events: ActivityEvent[];
  }>({
    queryKey: ["student-activity", activeStudent?.id],
    queryFn: async () => {
      const res = await fetch(`/api/family/activity?studentId=${activeStudent!.id}&limit=20`);
      if (!res.ok) return { events: [] };
      return res.json();
    },
    enabled: !!activeStudent,
  });

  // ---- Fetch selected student's applications ----
  const { data: appsData, isLoading: appsLoading } = useQuery<{
    applications: CollegeApplication[];
  }>({
    queryKey: ["student-applications", activeStudent?.id],
    queryFn: async () => {
      const res = await fetch(`/api/applications?studentId=${activeStudent!.id}`);
      if (!res.ok) return { applications: [] };
      return res.json();
    },
    enabled: !!activeStudent,
  });

  const favorites = favsData?.colleges ?? [];
  const folders = foldersData?.folders ?? [];
  const activity = activityData?.events ?? [];
  const applications = appsData?.applications ?? [];

  // ---- Loading ----
  if (userLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <FaIcon icon="spinner" style="duotone" className="text-2xl fa-spin text-muted-foreground" />
      </div>
    );
  }

  // ---- Not logged in ----
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Please log in to view your dashboard.</p>
            <Link href="/login">
              <Button className="mt-4">Log in</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---- Student view: redirect to main page ----
  if (!isParent) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-muted-foreground hover:text-foreground">
                <FaIcon icon="arrow-left" style="solid" className="text-sm" />
              </Link>
              <h1 className="text-lg font-semibold">Dashboard</h1>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-12 text-center">
          <FaIcon icon="graduation-cap" style="duotone" className="mb-4 text-4xl text-primary" />
          <h2 className="text-xl font-semibold">Student Dashboard</h2>
          <p className="mt-2 text-muted-foreground">
            Your college search is on the main page.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/">
              <Button>
                <FaIcon icon="search" style="solid" className="mr-2 text-sm" />
                Explore Colleges
              </Button>
            </Link>
            <Link href="/settings/family">
              <Button variant="outline">
                <FaIcon icon="users" style="duotone" className="mr-2 text-sm" />
                Family Connections
              </Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // ---- Parent Dashboard ----
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-muted-foreground hover:text-foreground">
              <FaIcon icon="arrow-left" style="solid" className="text-sm" />
            </Link>
            <h1 className="text-lg font-semibold">Parent Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/settings/family">
              <Button variant="outline" size="sm">
                <FaIcon icon="gear" style="duotone" className="mr-1.5 text-xs" />
                Family Settings
              </Button>
            </Link>
            <Link href="/">
              <Button size="sm">
                <FaIcon icon="search" style="solid" className="mr-1.5 text-xs" />
                Explore
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {studentsLoading ? (
          <div className="py-20 text-center text-muted-foreground">
            <FaIcon icon="spinner" style="duotone" className="fa-spin mr-2 text-xl" />
            <p className="mt-2 text-sm">Loading your students...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="py-20 text-center">
            <FaIcon icon="user-group" style="duotone" className="mb-4 text-4xl text-gray-300" />
            <h2 className="text-lg font-semibold">No Students Connected</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Connect with your student to see their college exploration progress.
            </p>
            <Link href="/settings/family">
              <Button className="mt-6">
                <FaIcon icon="paper-plane" style="solid" className="mr-2 text-sm" />
                Invite Your Student
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {/* ─── Student Selector (if multiple students) ─── */}
            {students.length > 1 && (
              <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
                {students.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStudentId(s.id)}
                    className={cn(
                      "flex items-center gap-2 whitespace-nowrap rounded-lg border px-4 py-2 text-sm transition-colors",
                      (activeStudent?.id === s.id)
                        ? "border-primary bg-primary/5 text-primary font-medium"
                        : "border-border hover:bg-gray-50",
                    )}
                  >
                    <FaIcon icon="graduation-cap" style="duotone" className="text-xs" />
                    {s.displayName || s.email}
                  </button>
                ))}
              </div>
            )}

            {activeStudent && (
              <>
                {/* ─── Student Overview Card ─── */}
                <Card className="mb-6">
                  <CardContent className="flex flex-wrap items-center gap-6 py-5">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                      <FaIcon icon="graduation-cap" style="duotone" className="text-2xl text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg font-semibold truncate">
                        {activeStudent.displayName || activeStudent.email}
                      </h2>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
                        {activeStudent.graduationYear && (
                          <span>
                            <FaIcon icon="calendar" style="duotone" className="mr-1 text-xs" />
                            Class of {activeStudent.graduationYear}
                          </span>
                        )}
                        {activeStudent.highSchool && (
                          <span>
                            <FaIcon icon="school" style="duotone" className="mr-1 text-xs" />
                            {activeStudent.highSchool}
                          </span>
                        )}
                        {activeStudent.lastActiveAt && (
                          <span>
                            <FaIcon icon="clock" style="duotone" className="mr-1 text-xs" />
                            Active {timeAgo(activeStudent.lastActiveAt)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-primary">{activeStudent.favoriteCount}</p>
                        <p className="text-xs text-muted-foreground">Favorites</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-primary">{activeStudent.folderCount}</p>
                        <p className="text-xs text-muted-foreground">Folders</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-primary">{applications.length}</p>
                        <p className="text-xs text-muted-foreground">Applications</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* ─── Application Progress Insights ─── */}
                {applications.length > 0 && (
                  <ApplicationInsights applications={applications} now={pageLoadTime} />
                )}

                {/* ─── Tabs: Favorites, Applications, Folders, Activity ─── */}
                <Tabs defaultValue="favorites">
                  <TabsList>
                    <TabsTrigger value="favorites">
                      <FaIcon icon="heart" style="duotone" className="mr-1.5 text-xs" />
                      Favorites ({favorites.length})
                    </TabsTrigger>
                    <TabsTrigger value="applications">
                      <FaIcon icon="clipboard-list" style="duotone" className="mr-1.5 text-xs" />
                      Applications ({applications.length})
                    </TabsTrigger>
                    <TabsTrigger value="folders">
                      <FaIcon icon="folder" style="duotone" className="mr-1.5 text-xs" />
                      Folders ({folders.length})
                    </TabsTrigger>
                    <TabsTrigger value="activity">
                      <FaIcon icon="clock-rotate-left" style="duotone" className="mr-1.5 text-xs" />
                      Activity
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="favorites" className="mt-4">
                    {favsLoading ? (
                      <div className="py-8 text-center text-muted-foreground">
                        <FaIcon icon="spinner" style="duotone" className="fa-spin" />
                      </div>
                    ) : favorites.length === 0 ? (
                      <Card>
                        <CardContent className="py-8 text-center text-muted-foreground">
                          <FaIcon icon="heart" style="duotone" className="mb-2 text-2xl text-gray-300" />
                          <p className="text-sm">No favorites yet.</p>
                          <p className="mt-1 text-xs">
                            Your student hasn&apos;t added any colleges to their favorites.
                          </p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {favorites.map((college) => (
                          <Link key={college.id} href={`/college/${college.id}`}>
                            <Card className="h-full transition-shadow hover:shadow-md">
                              <CardContent className="py-4">
                                <h3 className="font-medium text-foreground line-clamp-1">
                                  {college.name}
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                  {college.city}, {college.state}
                                </p>
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {college.type && (
                                    <Badge variant="outline" className="text-[10px]">
                                      {college.type}
                                    </Badge>
                                  )}
                                  {college.acceptanceRate != null && (
                                    <Badge variant="outline" className="text-[10px]">
                                      {formatPercent(college.acceptanceRate)} accept
                                    </Badge>
                                  )}
                                  {college.tuitionOutOfState != null && (
                                    <Badge variant="outline" className="text-[10px]">
                                      {formatCurrency(college.tuitionOutOfState)}
                                    </Badge>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          </Link>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="applications" className="mt-4">
                    {appsLoading ? (
                      <div className="py-8 text-center text-muted-foreground">
                        <FaIcon icon="spinner" style="duotone" className="fa-spin" />
                      </div>
                    ) : applications.length === 0 ? (
                      <Card>
                        <CardContent className="py-8 text-center text-muted-foreground">
                          <FaIcon icon="clipboard-list" style="duotone" className="mb-2 text-2xl text-gray-300" />
                          <p className="text-sm">No applications tracked yet.</p>
                          <p className="mt-1 text-xs">
                            Your student can track applications from any college detail page.
                          </p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-2">
                        {applications.map((app) => (
                          <ApplicationRow key={app.id} app={app} />
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="folders" className="mt-4">
                    {foldersLoading ? (
                      <div className="py-8 text-center text-muted-foreground">
                        <FaIcon icon="spinner" style="duotone" className="fa-spin" />
                      </div>
                    ) : folders.length === 0 ? (
                      <Card>
                        <CardContent className="py-8 text-center text-muted-foreground">
                          <FaIcon icon="folder" style="duotone" className="mb-2 text-2xl text-gray-300" />
                          <p className="text-sm">No shared folders.</p>
                          <p className="mt-1 text-xs">
                            Your student hasn&apos;t shared any folders with you yet.
                            They can enable sharing from their folder settings.
                          </p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {folders.map((folder) => (
                          <Card key={folder.id}>
                            <CardContent className="flex items-center gap-3 py-4">
                              <div
                                className="flex h-10 w-10 items-center justify-center rounded-lg"
                                style={{ backgroundColor: folder.color || "#e5e7eb" }}
                              >
                                <FaIcon icon="folder" style="duotone" className="text-white" />
                              </div>
                              <div>
                                <p className="font-medium text-foreground">{folder.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {folder.itemCount} {folder.itemCount === 1 ? "college" : "colleges"}
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="activity" className="mt-4">
                    {activityLoading ? (
                      <div className="py-8 text-center text-muted-foreground">
                        <FaIcon icon="spinner" style="duotone" className="fa-spin" />
                      </div>
                    ) : activity.length === 0 ? (
                      <Card>
                        <CardContent className="py-8 text-center text-muted-foreground">
                          <FaIcon icon="clock-rotate-left" style="duotone" className="mb-2 text-2xl text-gray-300" />
                          <p className="text-sm">No recent activity.</p>
                          <p className="mt-1 text-xs">
                            Activity will appear here as your student explores colleges.
                          </p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-1">
                        {activity.map((event) => (
                          <ActivityRow key={event.id} event={event} />
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Application Insights Card
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  researching: "bg-gray-200",
  applying: "bg-blue-400",
  applied: "bg-indigo-500",
  accepted: "bg-green-500",
  rejected: "bg-red-400",
  waitlisted: "bg-amber-400",
  deferred: "bg-orange-400",
  enrolled: "bg-emerald-600",
  withdrawn: "bg-gray-300",
};

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  researching: "Researching",
  applying: "Applying",
  applied: "Applied",
  accepted: "Accepted",
  rejected: "Rejected",
  waitlisted: "Waitlisted",
  deferred: "Deferred",
  enrolled: "Enrolled",
  withdrawn: "Withdrawn",
};

function ApplicationInsights({ applications, now }: { applications: CollegeApplication[]; now: number }) {

  const counts: Partial<Record<ApplicationStatus, number>> = {};
  for (const app of applications) {
    counts[app.status] = (counts[app.status] || 0) + 1;
  }

  const upcoming = applications
    .filter((a) => a.deadline && new Date(a.deadline).getTime() > now && !["accepted", "rejected", "enrolled", "withdrawn"].includes(a.status))
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
    .slice(0, 3);

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <FaIcon icon="chart-simple" style="duotone" className="text-primary" />
          Application Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status bar */}
        <div className="flex h-3 overflow-hidden rounded-full bg-gray-100">
          {(Object.entries(counts) as [ApplicationStatus, number][]).map(([status, count]) => (
            <div
              key={status}
              className={cn("transition-all", STATUS_COLORS[status])}
              style={{ width: `${(count / applications.length) * 100}%` }}
              title={`${STATUS_LABELS[status]}: ${count}`}
            />
          ))}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3">
          {(Object.entries(counts) as [ApplicationStatus, number][]).map(([status, count]) => (
            <span key={status} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={cn("h-2 w-2 rounded-full", STATUS_COLORS[status])} />
              {STATUS_LABELS[status]} ({count})
            </span>
          ))}
        </div>

        {/* Upcoming deadlines */}
        {upcoming.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">
              <FaIcon icon="calendar-clock" style="duotone" className="mr-1 text-[10px]" />
              Upcoming Deadlines
            </p>
            <div className="space-y-1">
              {upcoming.map((app) => {
                const daysUntil = Math.ceil(
                  (new Date(app.deadline!).getTime() - now) / 86_400_000,
                );
                return (
                  <div key={app.id} className="flex items-center justify-between text-xs">
                    <Link
                      href={`/college/${app.collegeId}`}
                      className="text-primary hover:underline truncate"
                    >
                      {app.collegeName || "Unknown College"}
                    </Link>
                    <span className={cn(
                      "shrink-0 ml-2",
                      daysUntil <= 7 ? "text-red-600 font-medium" : "text-muted-foreground",
                    )}>
                      {daysUntil === 0 ? "Today" : daysUntil === 1 ? "Tomorrow" : `${daysUntil} days`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Application Row
// ---------------------------------------------------------------------------

function ApplicationRow({ app }: { app: CollegeApplication }) {
  const statusCfg: Record<ApplicationStatus, { icon: string; color: string }> = {
    researching: { icon: "magnifying-glass", color: "text-gray-500" },
    applying: { icon: "pen-to-square", color: "text-blue-600" },
    applied: { icon: "paper-plane", color: "text-indigo-600" },
    accepted: { icon: "circle-check", color: "text-green-600" },
    rejected: { icon: "circle-xmark", color: "text-red-600" },
    waitlisted: { icon: "clock", color: "text-amber-600" },
    deferred: { icon: "hourglass-half", color: "text-orange-600" },
    enrolled: { icon: "graduation-cap", color: "text-emerald-700" },
    withdrawn: { icon: "arrow-right-from-bracket", color: "text-gray-400" },
  };

  const cfg = statusCfg[app.status];

  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-3">
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-full bg-gray-100", cfg.color)}>
          <FaIcon icon={cfg.icon} style="duotone" className="text-sm" />
        </div>
        <div className="flex-1 min-w-0">
          <Link
            href={`/college/${app.collegeId}`}
            className="text-sm font-medium text-foreground hover:text-primary truncate block"
          >
            {app.collegeName || "Unknown College"}
          </Link>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            {app.collegeCity && app.collegeState && (
              <span>{app.collegeCity}, {app.collegeState}</span>
            )}
            {app.applicationType && (
              <>
                <span className="text-border">·</span>
                <span>{STATUS_LABELS[app.status]}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end shrink-0">
          <Badge
            variant="outline"
            className={cn("text-[10px]", cfg.color)}
          >
            {STATUS_LABELS[app.status]}
          </Badge>
          {app.deadline && (
            <span className="text-[10px] text-muted-foreground mt-0.5">
              {new Date(app.deadline).toLocaleDateString()}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Activity Row
// ---------------------------------------------------------------------------

const ACTIVITY_CONFIG: Record<string, { icon: string; verb: string }> = {
  favorited_college: { icon: "heart", verb: "favorited" },
  unfavorited_college: { icon: "heart-crack", verb: "unfavorited" },
  added_note: { icon: "comment", verb: "added a note on" },
  updated_application: { icon: "clipboard-list", verb: "updated application for" },
  added_to_folder: { icon: "folder-plus", verb: "added to a folder" },
  created_folder: { icon: "folder", verb: "created a new folder" },
  accepted_suggestion: { icon: "lightbulb", verb: "accepted a suggestion for" },
};

function ActivityRow({ event }: { event: ActivityEvent }) {
  const cfg = ACTIVITY_CONFIG[event.action] || { icon: "circle", verb: event.action };

  return (
    <div className="flex items-start gap-3 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors">
      <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
        <FaIcon icon={cfg.icon} style="duotone" className="text-[10px] text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground">
          <span className="text-muted-foreground">{cfg.verb}</span>
          {event.collegeName && (
            <>
              {" "}
              <Link
                href={`/college/${event.collegeId}`}
                className="font-medium text-primary hover:underline"
              >
                {event.collegeName}
              </Link>
            </>
          )}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {timeAgo(event.createdAt)}
        </p>
      </div>
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}
