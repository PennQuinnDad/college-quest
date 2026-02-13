import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyAdmin } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  const authError = verifyAdmin(request);
  if (authError) return authError;

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("allowed_emails")
      .select("*")
      .order("email", { ascending: true });

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Error fetching allowed emails:", error);
    return NextResponse.json(
      { error: "Failed to fetch allowed emails" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authError = verifyAdmin(request);
  if (authError) return authError;

  try {
    const supabase = createServiceClient();
    const { email } = await request.json();

    if (!email || !email.trim()) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("allowed_emails")
      .insert({ email: email.trim().toLowerCase() })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Email already exists" },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error adding allowed email:", error);
    return NextResponse.json(
      { error: "Failed to add allowed email" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const authError = verifyAdmin(request);
  if (authError) return authError;

  try {
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("allowed_emails")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ message: "Email removed" });
  } catch (error) {
    console.error("Error removing allowed email:", error);
    return NextResponse.json(
      { error: "Failed to remove allowed email" },
      { status: 500 }
    );
  }
}
