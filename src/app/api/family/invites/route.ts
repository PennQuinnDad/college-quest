import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { sendFamilyInviteEmail } from "@/lib/email";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const service = createServiceClient();

    // Invites I sent
    const { data: sent = [], error: sentError } = await service
      .from("family_invites")
      .select("id, inviter_type, invited_email, token, expires_at, claimed, created_at")
      .eq("inviter_id", user.id)
      .order("created_at", { ascending: false });

    if (sentError) throw sentError;

    // Invites sent to me (matched by my email)
    const { data: received = [], error: receivedError } = await service
      .from("family_invites")
      .select(`
        id, inviter_type, invited_email, token, expires_at, claimed, created_at,
        inviter_id
      `)
      .ilike("invited_email", user.email || "")
      .eq("claimed", false)
      .order("created_at", { ascending: false });

    if (receivedError) throw receivedError;

    // For received invites, fetch inviter names
    const receivedWithNames = await Promise.all(
      (received || []).map(async (invite) => {
        const { data: inviterProfile } = await service
          .from("profiles")
          .select("display_name, email")
          .eq("id", invite.inviter_id)
          .maybeSingle();

        return {
          id: invite.id,
          inviterType: invite.inviter_type,
          inviterName: inviterProfile?.display_name || inviterProfile?.email || "Someone",
          invitedEmail: invite.invited_email,
          token: invite.token,
          expiresAt: invite.expires_at,
          claimed: invite.claimed,
          createdAt: invite.created_at,
        };
      }),
    );

    return NextResponse.json({
      sent: (sent || []).map((s) => ({
        id: s.id,
        inviterType: s.inviter_type,
        invitedEmail: s.invited_email,
        token: s.token,
        expiresAt: s.expires_at,
        claimed: s.claimed,
        createdAt: s.created_at,
      })),
      received: receivedWithNames,
    });
  } catch (error) {
    console.error("Error fetching invites:", error);
    return NextResponse.json(
      { error: "Failed to fetch invites" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/family/invites?id=...
 * Delete an invite (to allow re-inviting). Only the inviter can delete.
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const inviteId = searchParams.get("id");

    if (!inviteId) {
      return NextResponse.json(
        { error: "Invite id is required" },
        { status: 400 },
      );
    }

    const service = createServiceClient();
    const { error } = await service
      .from("family_invites")
      .delete()
      .eq("id", inviteId)
      .eq("inviter_id", user.id);

    if (error) throw error;

    return NextResponse.json({ message: "Invite deleted" });
  } catch (error) {
    console.error("Error deleting invite:", error);
    return NextResponse.json(
      { error: "Failed to delete invite" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/family/invites  { inviteId }
 * Resend the invite email for an existing pending invite.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { inviteId } = await request.json();
    if (!inviteId) {
      return NextResponse.json({ error: "inviteId is required" }, { status: 400 });
    }

    const service = createServiceClient();

    // Fetch the invite — must belong to the current user and be unclaimed
    const { data: invite, error } = await service
      .from("family_invites")
      .select("id, inviter_type, invited_email, token, expires_at, claimed")
      .eq("id", inviteId)
      .eq("inviter_id", user.id)
      .eq("claimed", false)
      .maybeSingle();

    if (error) throw error;

    if (!invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    if (new Date(invite.expires_at) <= new Date()) {
      return NextResponse.json({ error: "Invite has expired" }, { status: 410 });
    }

    // Get inviter's display name
    const { data: profile } = await service
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle();

    // Fire-and-forget email
    sendFamilyInviteEmail({
      to: invite.invited_email,
      inviterName: profile?.display_name ?? null,
      inviterType: invite.inviter_type as "parent" | "student",
      token: invite.token,
      expiresAt: invite.expires_at,
    });

    return NextResponse.json({ message: "Invite email resent" });
  } catch (error) {
    console.error("Error resending invite:", error);
    return NextResponse.json(
      { error: "Failed to resend invite" },
      { status: 500 },
    );
  }
}
