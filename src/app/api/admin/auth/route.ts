import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";

export async function GET() {
  const authError = await verifyAdmin();
  if (authError) return authError;

  return NextResponse.json({ authenticated: true });
}

export async function POST() {
  const authError = await verifyAdmin();
  if (authError) return authError;

  return NextResponse.json({ authenticated: true });
}
