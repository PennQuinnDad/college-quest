"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-user";
import { FaIcon } from "@/components/ui/fa-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toaster";

const CURRENT_YEAR = new Date().getFullYear();
const GRAD_YEARS = Array.from({ length: 8 }, (_, i) => CURRENT_YEAR + i);

export default function ProfileSettingsPage() {
  const { data: user, isLoading: userLoading } = useUser();
  const queryClient = useQueryClient();

  const [displayName, setDisplayName] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [highSchool, setHighSchool] = useState("");
  const [dirty, setDirty] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Populate form once when user data first becomes available
  if (user && !initialized) {
    setDisplayName(user.displayName || "");
    setGraduationYear(user.graduationYear ? String(user.graduationYear) : "");
    setHighSchool(user.highSchool || "");
    setInitialized(true);
  }

  const saveProfile = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {
        displayName: displayName.trim() || null,
      };
      if (user?.accountType === "student") {
        body.graduationYear = graduationYear || null;
        body.highSchool = highSchool.trim() || null;
      }

      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save profile");
      }
    },
    onSuccess: () => {
      toast({ title: "Profile saved!" });
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  if (userLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <FaIcon icon="spinner" style="duotone" className="text-2xl fa-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Please log in to edit your profile.</p>
            <Link href="/login">
              <Button className="mt-4">Log in</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isStudent = user.accountType === "student";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-muted-foreground transition-colors hover:text-foreground">
              <FaIcon icon="arrow-left" style="solid" className="text-sm" />
            </Link>
            <h1 className="text-lg font-semibold text-foreground">Profile Settings</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/settings/family"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Family
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 space-y-8">
        {/* Account Info (read-only) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FaIcon icon="circle-user" style="duotone" className="text-primary" />
              Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Email</span>
              <span className="text-sm font-medium">{user.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Account Type</span>
              <Badge variant="outline" className="capitalize">
                <FaIcon
                  icon={isStudent ? "graduation-cap" : "users"}
                  style="duotone"
                  className="mr-1.5 text-xs"
                />
                {user.accountType}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Role</span>
              <Badge variant="outline" className="capitalize">{user.role}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Editable Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FaIcon icon="pen-to-square" style="duotone" className="text-primary" />
              Profile Details
            </CardTitle>
            <CardDescription>
              Update your profile information visible to family members.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  setDirty(true);
                }}
                placeholder="Your name"
              />
            </div>

            {isStudent && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="graduationYear">Graduation Year</Label>
                  <Select
                    value={graduationYear}
                    onValueChange={(v) => {
                      setGraduationYear(v);
                      setDirty(true);
                    }}
                  >
                    <SelectTrigger id="graduationYear">
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {GRAD_YEARS.map((year) => (
                        <SelectItem key={year} value={String(year)}>
                          Class of {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="highSchool">
                    High School <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="highSchool"
                    value={highSchool}
                    onChange={(e) => {
                      setHighSchool(e.target.value);
                      setDirty(true);
                    }}
                    placeholder="e.g. Lincoln High School"
                  />
                </div>
              </>
            )}

            <Button
              onClick={() => saveProfile.mutate()}
              disabled={saveProfile.isPending || !dirty || !displayName.trim()}
              className="w-full"
            >
              {saveProfile.isPending ? (
                <FaIcon icon="spinner" style="duotone" className="mr-2 text-sm fa-spin" />
              ) : (
                <FaIcon icon="floppy-disk" style="duotone" className="mr-2 text-sm" />
              )}
              Save Changes
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
