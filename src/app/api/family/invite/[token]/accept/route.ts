import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const service = createServiceClient();

    // Find the invite by token
    const { data: invite, error: findError } = await service
      .from("family_invites")
      .select("*")
      .eq("token", token)
      .eq("claimed", false)
      .maybeSingle();

    if (findError) throw findError;

    if (!invite) {
      return NextResponse.json(
        { error: "Invite not found or already claimed" },
        { status: 404 },
      );
    }

    // Check expiry
    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "This invite has expired" },
        { status: 410 },
      );
    }

    // Verify the invite was sent to this user's email
    if (invite.invited_email && user.email) {
      if (invite.invited_email.toLowerCase() !== user.email.toLowerCase()) {
        return NextResponse.json(
          { error: "This invite was sent to a different email address" },
          { status: 403 },
        );
      }
    }

    // Can't accept your own invite
    if (invite.inviter_id === user.id) {
      return NextResponse.json(
        { error: "You cannot accept your own invite" },
        { status: 400 },
      );
    }

    // Determine parent/student based on inviter type
    // If inviter is a parent, the accepter is the student (and vice versa)
    const parentId = invite.inviter_type === "parent" ? invite.inviter_id : user.id;
    const studentId = invite.inviter_type === "parent" ? user.id : invite.inviter_id;

    // Create the family link
    const { error: linkError } = await service.from("family_links").insert({
      parent_id: parentId,
      student_id: studentId,
      status: "active",
      accepted_at: new Date().toISOString(),
    });

    if (linkError) {
      if (linkError.code === "23505") {
        // Link already exists
        return NextResponse.json(
          { error: "You are already linked with this person" },
          { status: 409 },
        );
      }
      throw linkError;
    }

    // Mark invite as claimed
    await service
      .from("family_invites")
      .update({
        claimed: true,
        claimed_by: user.id,
      })
      .eq("id", invite.id);

    return NextResponse.json({
      message: "Family link created successfully",
      link: { parentId, studentId },
    });
  } catch (error) {
    console.error("Error accepting invite:", error);
    return NextResponse.json(
      { error: "Failed to accept invite" },
      { status: 500 },
    );
  }
}
