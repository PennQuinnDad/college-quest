"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { useQueryClient } from "@tanstack/react-query";

type Step = "role" | "details" | "invite";
type AccountType = "student" | "parent";

const CURRENT_YEAR = new Date().getFullYear();
const GRAD_YEARS = Array.from({ length: 8 }, (_, i) => CURRENT_YEAR + i);

export default function OnboardingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: user, isLoading: userLoading } = useUser();

  const [step, setStep] = useState<Step>("role");
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [highSchool, setHighSchool] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [inviting, setInviting] = useState(false);

  // Pre-fill display name from user data
  useEffect(() => {
    if (user?.displayName) {
      setDisplayName(user.displayName);
    }
    // Pre-select account type if suggested
    if (user?.accountType && user.accountType !== "student") {
      setAccountType(user.accountType);
    }
  }, [user]);

  // Redirect if already completed or not logged in
  useEffect(() => {
    if (!userLoading && !user) {
      router.replace("/login");
    }
    if (!userLoading && user?.profileCompleted) {
      router.replace("/");
    }
  }, [user, userLoading, router]);

  async function handleSaveProfile() {
    if (!accountType) return;

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        accountType,
        displayName: displayName.trim() || null,
      };
      if (accountType === "student") {
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

      // Invalidate user cache so the rest of the app picks up new profile
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      setStep("invite");
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : "Failed to save profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleSendInvite() {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ title: "Please enter a valid email address", variant: "destructive" });
      return;
    }

    setInviting(true);
    try {
      const res = await fetch("/api/family/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to send invite");
      }

      toast({ title: "Invite sent!" });
      setInviteEmail("");
      // Short delay so they see the toast, then redirect
      setTimeout(() => router.replace("/"), 1000);
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : "Failed to send invite",
        variant: "destructive",
      });
    } finally {
      setInviting(false);
    }
  }

  function handleFinish() {
    router.replace("/");
  }

  if (userLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <FaIcon icon="spinner" style="duotone" className="text-2xl fa-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
      {/* Background gradient — matches login page */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(0,0,120,0.08) 0%, transparent 60%), " +
            "radial-gradient(ellipse 60% 50% at 80% 100%, rgba(171,245,233,0.15) 0%, transparent 60%), " +
            "linear-gradient(to bottom, #fbfbf8, #f4f4f0)",
        }}
      />

      <div className="w-full max-w-lg">
        {/* Progress indicator */}
        <div className="mb-6 flex items-center justify-center gap-2">
          {(["role", "details", "invite"] as Step[]).map((s, i) => (
            <div
              key={s}
              className={cn(
                "h-2 rounded-full transition-all",
                s === step ? "w-8 bg-primary" : "w-2 bg-gray-300",
                (["role", "details", "invite"].indexOf(step) > i) && s !== step && "bg-primary/40",
              )}
            />
          ))}
        </div>

        {/* ─── Step 1: Account Type Selection ─── */}
        {step === "role" && (
          <div className="space-y-4">
            <div className="text-center">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Welcome to College Quest!
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Let&apos;s set up your account. Which best describes you?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card
                className={cn(
                  "cursor-pointer transition-all hover:border-primary/50 hover:shadow-md",
                  accountType === "student" && "border-primary ring-2 ring-primary/20 shadow-md",
                )}
                onClick={() => setAccountType("student")}
              >
                <CardContent className="flex flex-col items-center gap-3 pt-8 pb-6">
                  <div className={cn(
                    "flex h-16 w-16 items-center justify-center rounded-2xl transition-colors",
                    accountType === "student" ? "bg-primary text-white" : "bg-gray-100 text-gray-500",
                  )}>
                    <FaIcon icon="graduation-cap" style="duotone" className="text-2xl" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-foreground">I&apos;m a Student</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Exploring colleges for myself
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card
                className={cn(
                  "cursor-pointer transition-all hover:border-primary/50 hover:shadow-md",
                  accountType === "parent" && "border-primary ring-2 ring-primary/20 shadow-md",
                )}
                onClick={() => setAccountType("parent")}
              >
                <CardContent className="flex flex-col items-center gap-3 pt-8 pb-6">
                  <div className={cn(
                    "flex h-16 w-16 items-center justify-center rounded-2xl transition-colors",
                    accountType === "parent" ? "bg-primary text-white" : "bg-gray-100 text-gray-500",
                  )}>
                    <FaIcon icon="users" style="duotone" className="text-2xl" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-foreground">I&apos;m a Parent</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Helping my student find colleges
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Button
              className="w-full bg-primary"
              size="lg"
              disabled={!accountType}
              onClick={() => setStep("details")}
            >
              Continue
              <FaIcon icon="arrow-right" style="solid" className="ml-2 text-sm" />
            </Button>
          </div>
        )}

        {/* ─── Step 2: Profile Details ─── */}
        {step === "details" && (
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-xl">
                {accountType === "student" ? "Student Details" : "Parent Details"}
              </CardTitle>
              <CardDescription>
                {accountType === "student"
                  ? "Tell us a bit about yourself so we can personalize your experience."
                  : "Tell us your name so your student can recognize you."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                />
              </div>

              {accountType === "student" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="graduationYear">Graduation Year</Label>
                    <Select value={graduationYear} onValueChange={setGraduationYear}>
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
                      onChange={(e) => setHighSchool(e.target.value)}
                      placeholder="e.g. Lincoln High School"
                    />
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setStep("role")}
                  className="flex-1"
                >
                  <FaIcon icon="arrow-left" style="solid" className="mr-2 text-sm" />
                  Back
                </Button>
                <Button
                  className="flex-1 bg-primary"
                  onClick={handleSaveProfile}
                  disabled={saving || !displayName.trim()}
                >
                  {saving ? (
                    <FaIcon icon="spinner" style="duotone" className="mr-2 text-sm fa-spin" />
                  ) : (
                    <FaIcon icon="check" style="solid" className="mr-2 text-sm" />
                  )}
                  Save & Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ─── Step 3: Family Invite (optional) ─── */}
        {step === "invite" && (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 mb-2">
                <FaIcon icon="check" style="solid" className="text-lg text-green-600" />
              </div>
              <CardTitle className="text-xl">Profile Created!</CardTitle>
              <CardDescription>
                {accountType === "parent"
                  ? "Would you like to invite your student to College Quest? They'll be able to link their account to yours."
                  : "Would you like to connect with a parent? They'll be able to see your college list."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="inviteEmail">
                  {accountType === "parent" ? "Student's Email" : "Parent's Email"}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="inviteEmail"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendInvite()}
                    placeholder="Enter their email address"
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSendInvite}
                    disabled={inviting || !inviteEmail.trim()}
                    className="bg-primary"
                  >
                    {inviting ? (
                      <FaIcon icon="spinner" style="duotone" className="mr-2 text-sm fa-spin" />
                    ) : (
                      <FaIcon icon="paper-plane" style="solid" className="mr-2 text-sm" />
                    )}
                    Send Invite
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  They&apos;ll receive access to College Quest and can link their account to yours.
                </p>
              </div>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-2 text-muted-foreground">or</span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={handleFinish}
              >
                Skip for now — go to College Quest
                <FaIcon icon="arrow-right" style="solid" className="ml-2 text-sm" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} College Quest
        </p>
      </div>
    </div>
  );
}
