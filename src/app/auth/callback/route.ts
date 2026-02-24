import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const isLocalEnv = process.env.NODE_ENV === "development";

  const base = !isLocalEnv && forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : origin;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Check if user email is allowed
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.email) {
        const service = createServiceClient();
        const { data: allowed } = await service
          .from("allowed_emails")
          .select("id, suggested_account_type")
          .ilike("email", user.email)
          .limit(1);

        if (!allowed || allowed.length === 0) {
          // Sign out unauthorized user
          await supabase.auth.signOut();
          return NextResponse.redirect(`${base}/login?error=unauthorized`);
        }

        // Eagerly create profile if it doesn't exist
        const suggestedType = allowed[0]?.suggested_account_type || "student";
        await service.from("profiles").upsert(
          {
            id: user.id,
            email: user.email,
            display_name: user.user_metadata?.full_name || null,
            role: "user",
            account_type: suggestedType,
          },
          { onConflict: "id", ignoreDuplicates: true },
        );

        // Redirect to onboarding if profile not yet completed
        const { data: profile } = await service
          .from("profiles")
          .select("profile_completed")
          .eq("id", user.id)
          .maybeSingle();

        if (!profile?.profile_completed) {
          return NextResponse.redirect(`${base}/onboarding`);
        }
      }

      return NextResponse.redirect(`${base}${next}`);
    }
  }

  return NextResponse.redirect(`${base}/login?error=auth`);
}
