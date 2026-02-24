import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

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
