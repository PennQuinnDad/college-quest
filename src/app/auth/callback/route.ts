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
          .select("id")
          .ilike("email", user.email)
          .limit(1);

        if (!allowed || allowed.length === 0) {
          // Sign out unauthorized user
          await supabase.auth.signOut();
          return NextResponse.redirect(`${base}/login?error=unauthorized`);
        }
      }

      return NextResponse.redirect(`${base}${next}`);
    }
  }

  return NextResponse.redirect(`${base}/login?error=auth`);
}
