"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import type { FamilyMember, FamilyInvite } from "@/lib/types";

export default function FamilySettingsPage() {
  const { data: user, isLoading: userLoading } = useUser();
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState("");
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [revokingLinkId, setRevokingLinkId] = useState<string | null>(null);

  // ---- Fetch family members ----
  const { data: membersData, isLoading: membersLoading } = useQuery<{
    members: FamilyMember[];
  }>({
    queryKey: ["family-links"],
    queryFn: async () => {
      const res = await fetch("/api/family/links");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!user,
  });

  // ---- Fetch invites ----
  const { data: invitesData, isLoading: invitesLoading } = useQuery<{
    sent: FamilyInvite[];
    received: FamilyInvite[];
  }>({
    queryKey: ["family-invites"],
    queryFn: async () => {
      const res = await fetch("/api/family/invites");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!user,
  });

  // ---- Send invite mutation ----
  const sendInvite = useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch("/api/family/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to send invite");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Invite sent!" });
      setInviteEmail("");
      queryClient.invalidateQueries({ queryKey: ["family-invites"] });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  // ---- Accept invite mutation ----
  const acceptInvite = useMutation({
    mutationFn: async (token: string) => {
      const res = await fetch(`/api/family/invite/${token}/accept`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to accept invite");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Family link created!" });
      queryClient.invalidateQueries({ queryKey: ["family-links"] });
      queryClient.invalidateQueries({ queryKey: ["family-invites"] });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  // ---- Revoke link mutation ----
  const revokeLink = useMutation({
    mutationFn: async (linkId: string) => {
      const res = await fetch("/api/family/links", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkId, action: "revoke" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to revoke link");
      }
    },
    onSuccess: () => {
      toast({ title: "Family connection removed" });
      setRevokeDialogOpen(false);
      setRevokingLinkId(null);
      queryClient.invalidateQueries({ queryKey: ["family-links"] });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  // ---- Privacy toggle mutation ----
  const updatePrivacy = useMutation({
    mutationFn: async (params: {
      linkId: string;
      canViewFavorites?: boolean;
      canViewFolders?: boolean;
      canViewActivity?: boolean;
    }) => {
      const res = await fetch("/api/family/links", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update");
      }
    },
    onSuccess: () => {
      toast({ title: "Privacy settings updated" });
      queryClient.invalidateQueries({ queryKey: ["family-links"] });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  function handleSendInvite() {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ title: "Please enter a valid email", variant: "destructive" });
      return;
    }
    sendInvite.mutate(email);
  }

  const members = membersData?.members ?? [];
  const activeMembers = members.filter((m) => m.status === "active");
  const sentInvites = invitesData?.sent ?? [];
  const receivedInvites = invitesData?.received ?? [];
  const pendingSent = sentInvites.filter((i) => !i.claimed && new Date(i.expiresAt) > new Date());
  const isParent = user?.accountType === "parent";
  const isStudent = user?.accountType === "student";
  const isLoading = userLoading || membersLoading || invitesLoading;

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
            <p className="text-muted-foreground">Please log in to manage family connections.</p>
            <Link href="/login">
              <Button className="mt-4">Log in</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <FaIcon icon="arrow-left" style="solid" className="text-sm" />
            </Link>
            <h1 className="text-lg font-semibold text-foreground">Family Connections</h1>
          </div>
          <Badge variant="outline" className="capitalize">
            <FaIcon
              icon={isParent ? "users" : "graduation-cap"}
              style="duotone"
              className="mr-1.5 text-xs"
            />
            {user.accountType}
          </Badge>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 space-y-8">
        {/* ─── Active Family Members ─── */}
        <section>
          <h2 className="mb-4 text-base font-semibold text-foreground">
            <FaIcon icon="link" style="duotone" className="mr-2 text-primary" />
            Connected Family
          </h2>

          {isLoading ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <FaIcon icon="spinner" style="duotone" className="fa-spin mr-2" />
                Loading...
              </CardContent>
            </Card>
          ) : activeMembers.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <FaIcon icon="user-group" style="duotone" className="mb-2 text-2xl text-gray-300" />
                <p className="text-sm">No family connections yet.</p>
                <p className="mt-1 text-xs">
                  Send an invite below to connect with your {isParent ? "student" : "parent"}.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {activeMembers.map((member) => (
                <Card key={member.linkId}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <FaIcon
                          icon={member.accountType === "parent" ? "users" : "graduation-cap"}
                          style="duotone"
                        />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {member.displayName || member.email}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {member.accountType}
                          </Badge>
                          {member.graduationYear && (
                            <span>Class of {member.graduationYear}</span>
                          )}
                          {member.highSchool && <span>{member.highSchool}</span>}
                        </div>
                      </div>
                    </div>

                    <Dialog
                      open={revokeDialogOpen && revokingLinkId === member.linkId}
                      onOpenChange={(open) => {
                        setRevokeDialogOpen(open);
                        if (!open) setRevokingLinkId(null);
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setRevokingLinkId(member.linkId)}
                        >
                          <FaIcon icon="link-slash" style="solid" className="mr-1.5 text-xs" />
                          Remove
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Remove Family Connection?</DialogTitle>
                          <DialogDescription>
                            This will disconnect you from{" "}
                            <strong>{member.displayName || member.email}</strong>. They will no
                            longer be able to see your shared data, and you won&apos;t see theirs.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setRevokeDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => revokeLink.mutate(member.linkId)}
                            disabled={revokeLink.isPending}
                          >
                            {revokeLink.isPending ? "Removing..." : "Remove Connection"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* ─── Privacy Controls (student only) ─── */}
        {isStudent && activeMembers.length > 0 && (
          <section>
            <h2 className="mb-4 text-base font-semibold text-foreground">
              <FaIcon icon="shield-halved" style="duotone" className="mr-2 text-primary" />
              Privacy Controls
            </h2>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>
                  Choose what your connected parents can see.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {activeMembers.map((parent) => (
                  <div key={parent.linkId} className="space-y-3">
                    <p className="text-sm font-medium">
                      {parent.displayName || parent.email}
                    </p>
                    {(
                      [
                        { key: "canViewFavorites", label: "Favorites", icon: "heart" },
                        { key: "canViewFolders", label: "Folders", icon: "folder" },
                        { key: "canViewActivity", label: "Activity", icon: "clock" },
                      ] as const
                    ).map(({ key, label, icon }) => (
                      <label
                        key={key}
                        className="flex cursor-pointer items-center justify-between rounded-lg border px-4 py-3 transition-colors hover:bg-gray-50"
                      >
                        <span className="flex items-center gap-2 text-sm">
                          <FaIcon icon={icon} style="duotone" className="text-muted-foreground" />
                          Can view my {label.toLowerCase()}
                        </span>
                        <input
                          type="checkbox"
                          checked={parent[key]}
                          onChange={(e) =>
                            updatePrivacy.mutate({
                              linkId: parent.linkId,
                              [key]: e.target.checked,
                            })
                          }
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                      </label>
                    ))}
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        )}

        {/* ─── Received Invites ─── */}
        {receivedInvites.length > 0 && (
          <section>
            <h2 className="mb-4 text-base font-semibold text-foreground">
              <FaIcon icon="envelope" style="duotone" className="mr-2 text-primary" />
              Pending Invitations
            </h2>
            <div className="space-y-3">
              {receivedInvites.map((invite) => (
                <Card key={invite.id}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div>
                      <p className="text-sm font-medium">
                        Invitation from <strong>{invite.inviterName || "Someone"}</strong>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        They are a {invite.inviterType} &middot; Expires{" "}
                        {new Date(invite.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => acceptInvite.mutate(invite.token)}
                      disabled={acceptInvite.isPending}
                    >
                      <FaIcon icon="check" style="solid" className="mr-1.5 text-xs" />
                      Accept
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* ─── Send Invite ─── */}
        <section>
          <h2 className="mb-4 text-base font-semibold text-foreground">
            <FaIcon icon="paper-plane" style="duotone" className="mr-2 text-primary" />
            Send an Invite
          </h2>
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="inviteEmail">
                  {isParent ? "Student's Email" : "Parent's Email"}
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
                    disabled={sendInvite.isPending || !inviteEmail.trim()}
                  >
                    {sendInvite.isPending ? (
                      <FaIcon icon="spinner" style="duotone" className="mr-2 text-sm fa-spin" />
                    ) : (
                      <FaIcon icon="paper-plane" style="solid" className="mr-2 text-sm" />
                    )}
                    Send
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  They&apos;ll receive access to College Quest and can link their account with
                  yours.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ─── Sent Invites ─── */}
        {pendingSent.length > 0 && (
          <section>
            <h2 className="mb-4 text-base font-semibold text-foreground">
              <FaIcon icon="clock" style="duotone" className="mr-2 text-muted-foreground" />
              Pending Sent Invites
            </h2>
            <div className="space-y-2">
              {pendingSent.map((invite) => (
                <Card key={invite.id}>
                  <CardContent className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm">{invite.invitedEmail}</p>
                      <p className="text-xs text-muted-foreground">
                        Expires {new Date(invite.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-amber-600">
                      <FaIcon icon="hourglass-half" style="duotone" className="mr-1 text-[10px]" />
                      Pending
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
