import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

async function verifyFolderOwnership(
  service: ReturnType<typeof createServiceClient>,
  folderId: string,
  userId: string
): Promise<boolean> {
  const { data } = await service
    .from("favorite_folders")
    .select("id")
    .eq("id", folderId)
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  try {
    const { folderId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const service = createServiceClient();

    if (!(await verifyFolderOwnership(service, folderId, user.id))) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    const { data, error } = await service
      .from("favorite_folder_items")
      .select("college_id")
      .eq("folder_id", folderId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      items: (data || []).map((i: { college_id: string }) => i.college_id),
    });
  } catch (error) {
    console.error("Error fetching folder items:", error);
    return NextResponse.json(
      { error: "Failed to fetch folder items" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  try {
    const { folderId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { collegeId } = await request.json();

    if (!collegeId || typeof collegeId !== "string") {
      return NextResponse.json(
        { error: "collegeId is required" },
        { status: 400 }
      );
    }

    const service = createServiceClient();

    if (!(await verifyFolderOwnership(service, folderId, user.id))) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    const { error } = await service.from("favorite_folder_items").insert({
      folder_id: folderId,
      college_id: collegeId,
    });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { message: "Item already in folder" },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json({ message: "Item added to folder" }, { status: 201 });
  } catch (error) {
    console.error("Error adding item to folder:", error);
    return NextResponse.json(
      { error: "Failed to add item to folder" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  try {
    const { folderId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const collegeId = searchParams.get("collegeId");

    if (!collegeId) {
      return NextResponse.json(
        { error: "collegeId is required" },
        { status: 400 }
      );
    }

    const service = createServiceClient();

    if (!(await verifyFolderOwnership(service, folderId, user.id))) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    const { error } = await service
      .from("favorite_folder_items")
      .delete()
      .eq("folder_id", folderId)
      .eq("college_id", collegeId);

    if (error) throw error;

    return NextResponse.json({ message: "Item removed from folder" });
  } catch (error) {
    console.error("Error removing item from folder:", error);
    return NextResponse.json(
      { error: "Failed to remove item from folder" },
      { status: 500 }
    );
  }
}
