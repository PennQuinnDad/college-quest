import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyAdmin } from "@/lib/admin-auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; resourceId: string }> }
) {
  const authError = await verifyAdmin();
  if (authError) return authError;

  try {
    const { id, resourceId } = await params;
    const body = await request.json();

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (body.title !== undefined) updates.title = body.title;
    if (body.url !== undefined) updates.url = body.url;
    if (body.description !== undefined) updates.description = body.description || null;
    if (body.category !== undefined) updates.category = body.category || null;

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("college_resources")
      .update(updates)
      .eq("id", resourceId)
      .eq("college_id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating resource:", error);
    return NextResponse.json(
      { error: "Failed to update resource" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; resourceId: string }> }
) {
  const authError = await verifyAdmin();
  if (authError) return authError;

  try {
    const { id, resourceId } = await params;
    const supabase = createServiceClient();

    const { error } = await supabase
      .from("college_resources")
      .delete()
      .eq("id", resourceId)
      .eq("college_id", id);

    if (error) throw error;

    return NextResponse.json({ message: "Resource deleted" });
  } catch (error) {
    console.error("Error deleting resource:", error);
    return NextResponse.json(
      { error: "Failed to delete resource" },
      { status: 500 }
    );
  }
}
