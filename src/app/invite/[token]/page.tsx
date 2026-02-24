"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FaIcon } from "@/components/ui/fa-icon";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useUser } from "@/hooks/use-user";
import { toast } from "@/components/ui/toaster";

export default function InviteAcceptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();
  const { data: user, isLoading } = useUser();
  const [accepting, setAccepting] = useState(false);
  const [result, setResult] = useState<"success" | "error" | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleAccept() {
    setAccepting(true);
    try {
      const res = await fetch(`/api/family/invite/${token}/accept`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        setResult("error");
        setErrorMsg(data.error || "Failed to accept invite");
        return;
      }

      setResult("success");
      toast({ title: "Family link created!" });
      setTimeout(() => router.push("/settings/family"), 2000);
    } catch {
      setResult("error");
      setErrorMsg("Something went wrong. Please try again.");
    } finally {
      setAccepting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(0,0,120,0.08) 0%, transparent 60%), " +
            "linear-gradient(to bottom, #fbfbf8, #f4f4f0)",
        }}
      />

      <Card className="w-full max-w-md">
        {isLoading ? (
          <CardContent className="py-12 text-center">
            <FaIcon icon="spinner" style="duotone" className="text-2xl fa-spin text-muted-foreground" />
          </CardContent>
        ) : !user ? (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-2">
                <FaIcon icon="envelope-open" style="duotone" className="text-lg text-primary" />
              </div>
              <CardTitle>Family Invitation</CardTitle>
              <CardDescription>
                You&apos;ve been invited to join College Quest. Please log in or create an account
                to accept this invitation.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Link href={`/login?next=/invite/${token}`}>
                <Button className="w-full">
                  <FaIcon icon="right-to-bracket" style="duotone" className="mr-2 text-sm" />
                  Log in to Accept
                </Button>
              </Link>
            </CardContent>
          </>
        ) : result === "success" ? (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 mb-2">
                <FaIcon icon="check" style="solid" className="text-lg text-green-600" />
              </div>
              <CardTitle>Connected!</CardTitle>
              <CardDescription>
                Your family accounts are now linked. Redirecting to family settings...
              </CardDescription>
            </CardHeader>
          </>
        ) : result === "error" ? (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-2">
                <FaIcon icon="xmark" style="solid" className="text-lg text-red-600" />
              </div>
              <CardTitle>Invitation Issue</CardTitle>
              <CardDescription>{errorMsg}</CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-2">
              <Link href="/settings/family">
                <Button variant="outline" className="w-full">
                  Go to Family Settings
                </Button>
              </Link>
              <Link href="/">
                <Button variant="ghost" className="w-full">
                  Back to Home
                </Button>
              </Link>
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-2">
                <FaIcon icon="users" style="duotone" className="text-lg text-primary" />
              </div>
              <CardTitle>Family Invitation</CardTitle>
              <CardDescription>
                Accept this invitation to link your College Quest account with a family member.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border bg-gray-50 p-3 text-center text-sm">
                <p className="text-muted-foreground">Logged in as</p>
                <p className="font-medium text-foreground">
                  {user.displayName || user.email}
                </p>
              </div>
              <Button
                className="w-full"
                onClick={handleAccept}
                disabled={accepting}
              >
                {accepting ? (
                  <FaIcon icon="spinner" style="duotone" className="mr-2 text-sm fa-spin" />
                ) : (
                  <FaIcon icon="link" style="solid" className="mr-2 text-sm" />
                )}
                Accept Invitation
              </Button>
              <Link href="/">
                <Button variant="ghost" className="w-full">
                  Cancel
                </Button>
              </Link>
            </CardContent>
          </>
        )}
      </Card>

      <p className="absolute bottom-4 text-center text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} College Quest
      </p>
    </div>
  );
}
