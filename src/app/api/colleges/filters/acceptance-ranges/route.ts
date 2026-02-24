import { NextResponse } from "next/server";

export async function GET() {
  const response = NextResponse.json([
    "Highly Selective (0-15%)",
    "Selective (15-30%)",
    "Moderately Selective (30-50%)",
    "Less Selective (50-75%)",
    "Open Admission (75%+)",
  ]);
  response.headers.set("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=86400");
  return response;
}
