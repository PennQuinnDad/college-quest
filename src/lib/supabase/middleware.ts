import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Paths that should NOT trigger the onboarding redirect
const ONBOARDING_EXEMPT = new Set([
  "/onboarding",
  "/login",
  "/auth/callback",
  "/auth/signout",
]);

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // For authenticated users, check if they need to complete onboarding
  const pathname = request.nextUrl.pathname;
  if (
    user &&
    !ONBOARDING_EXEMPT.has(pathname) &&
    !pathname.startsWith("/api/") &&
    !pathname.startsWith("/auth/")
  ) {
    // Use a lightweight query via the user's Supabase client
    const { data: profile } = await supabase
      .from("profiles")
      .select("profile_completed")
      .eq("id", user.id)
      .maybeSingle();

    if (profile && !profile.profile_completed) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
