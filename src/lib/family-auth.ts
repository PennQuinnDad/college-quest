import { createServiceClient } from "@/lib/supabase/server";

/**
 * Verify that a parent has an active family link with a student
 * and the required permission. Returns the link data or null.
 */
export async function verifyParentAccess(
  parentId: string,
  studentId: string,
  permission?: "can_view_favorites" | "can_view_folders" | "can_view_activity",
) {
  const service = createServiceClient();

  const { data: link } = await service
    .from("family_links")
    .select("id, parent_id, student_id, can_view_favorites, can_view_folders, can_view_activity")
    .eq("parent_id", parentId)
    .eq("student_id", studentId)
    .eq("status", "active")
    .maybeSingle();

  if (!link) return null;
  if (permission && !link[permission]) return null;

  return link;
}
