import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const { origin } = new URL(request.url);

  const redirectBase = forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : origin;

  return NextResponse.redirect(`${redirectBase}/login`);
}
