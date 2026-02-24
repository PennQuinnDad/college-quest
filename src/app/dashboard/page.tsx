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
import type { StudentSummary } from "@/lib/types";

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

  const favorites = favsData?.colleges ?? [];
  const folders = foldersData?.folders ?? [];

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
                    </div>
                  </CardContent>
                </Card>

                {/* ─── Tabs: Favorites & Folders ─── */}
                <Tabs defaultValue="favorites">
                  <TabsList>
                    <TabsTrigger value="favorites">
                      <FaIcon icon="heart" style="duotone" className="mr-1.5 text-xs" />
                      Favorites ({favorites.length})
                    </TabsTrigger>
                    <TabsTrigger value="folders">
                      <FaIcon icon="folder" style="duotone" className="mr-1.5 text-xs" />
                      Shared Folders ({folders.length})
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
                </Tabs>
              </>
            )}
          </>
        )}
      </main>
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
