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
    const { data: profile } = await service
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    // Throttled last_active_at update — only if >5 min since last recorded
    if (profile) {
      const lastActive = profile.last_active_at
        ? new Date(profile.last_active_at).getTime()
        : 0;
      if (Date.now() - lastActive > 5 * 60 * 1000) {
        await service
          .from("profiles")
          .update({ last_active_at: new Date().toISOString() })
          .eq("id", user.id);
      }
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      displayName:
        profile?.display_name || user.user_metadata?.full_name || null,
      role: profile?.role || "user",
      accountType: profile?.account_type || "student",
      graduationYear: profile?.graduation_year || null,
      highSchool: profile?.high_school || null,
      profileCompleted: profile?.profile_completed ?? false,
      avatarUrl: user.user_metadata?.avatar_url || null,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { accountType, graduationYear, highSchool, displayName } = body;

    // Validate accountType
    if (accountType && !["student", "parent"].includes(accountType)) {
      return NextResponse.json(
        { error: "accountType must be 'student' or 'parent'" },
        { status: 400 },
      );
    }

    // Validate graduationYear
    if (graduationYear !== undefined && graduationYear !== null) {
      const year = parseInt(graduationYear);
      if (isNaN(year) || year < 2020 || year > 2040) {
        return NextResponse.json(
          { error: "graduationYear must be between 2020 and 2040" },
          { status: 400 },
        );
      }
    }

    const service = createServiceClient();

    // Build update object — only include provided fields
    const updates: Record<string, unknown> = {
      profile_completed: true,
      last_active_at: new Date().toISOString(),
    };
    if (accountType !== undefined) updates.account_type = accountType;
    if (graduationYear !== undefined)
      updates.graduation_year = graduationYear ? parseInt(graduationYear) : null;
    if (highSchool !== undefined) updates.high_school = highSchool || null;
    if (displayName !== undefined) updates.display_name = displayName || null;

    const { error } = await service
      .from("profiles")
      .update(updates)
      .eq("id", user.id);

    if (error) throw error;

    return NextResponse.json({ message: "Profile updated" });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 },
    );
  }
}
