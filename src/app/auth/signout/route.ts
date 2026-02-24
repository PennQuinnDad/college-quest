import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const { origin } = new URL(request.url);

  // Only trust x-forwarded-host when TRUSTED_HOSTS is configured and matches
  const trustedHosts = process.env.TRUSTED_HOSTS?.split(",").map(h => h.trim()) ?? [];
  const redirectBase = forwardedHost && trustedHosts.includes(forwardedHost)
    ? `${forwardedProto}://${forwardedHost}`
    : origin;

  return NextResponse.redirect(`${redirectBase}/login`);
}
