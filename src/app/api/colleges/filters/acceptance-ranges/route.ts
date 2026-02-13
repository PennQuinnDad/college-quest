import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json([
    "Highly Selective (0-15%)",
    "Selective (15-30%)",
    "Moderately Selective (30-50%)",
    "Less Selective (50-75%)",
    "Open Admission (75%+)",
  ]);
}
