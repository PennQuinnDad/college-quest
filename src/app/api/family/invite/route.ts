import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email } = await request.json();
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 },
      );
    }

    // Can't invite yourself
    if (normalizedEmail === user.email?.toLowerCase()) {
      return NextResponse.json(
        { error: "You cannot invite yourself" },
        { status: 400 },
      );
    }

    const service = createServiceClient();

    // Get current user's profile to determine inviter type
    const { data: profile } = await service
      .from("profiles")
      .select("account_type, display_name")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found. Please complete onboarding first." },
        { status: 400 },
      );
    }

    const inviterType = profile.account_type as "parent" | "student";

    // Check for existing pending invite to same email
    const { data: existingInvite } = await service
      .from("family_invites")
      .select("id")
      .eq("inviter_id", user.id)
      .eq("invited_email", normalizedEmail)
      .eq("claimed", false)
      .maybeSingle();

    if (existingInvite) {
      return NextResponse.json(
        { error: "You already have a pending invite to this email" },
        { status: 409 },
      );
    }

    // Generate a secure invite token
    const token = crypto.randomUUID();

    // Create the invite
    const { data: invite, error: inviteError } = await service
      .from("family_invites")
      .insert({
        inviter_id: user.id,
        inviter_type: inviterType,
        invited_email: normalizedEmail,
        token,
      })
      .select()
      .single();

    if (inviteError) throw inviteError;

    // Auto-add to allowed_emails if not already present (so invitee can log in)
    const suggestedType = inviterType === "parent" ? "student" : "parent";
    await service.from("allowed_emails").upsert(
      {
        email: normalizedEmail,
        suggested_account_type: suggestedType,
      },
      { onConflict: "email", ignoreDuplicates: true },
    );

    return NextResponse.json(
      {
        id: invite.id,
        token: invite.token,
        invitedEmail: normalizedEmail,
        expiresAt: invite.expires_at,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating invite:", error);
    return NextResponse.json(
      { error: "Failed to create invite" },
      { status: 500 },
    );
  }
}
