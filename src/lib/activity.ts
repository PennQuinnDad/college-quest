import { createServiceClient } from "@/lib/supabase/server";
import type { ActivityAction } from "@/lib/types";

/**
 * Log a user activity event. Fire-and-forget — errors are swallowed
 * so callers don't fail if logging breaks.
 */
export async function logActivity(
  userId: string,
  action: ActivityAction,
  opts: {
    collegeId?: string;
    metadata?: Record<string, unknown>;
    visibility?: "family" | "private";
  } = {},
) {
  try {
    const service = createServiceClient();
    await service.from("activity_log").insert({
      user_id: userId,
      action,
      college_id: opts.collegeId ?? null,
      metadata: opts.metadata ?? {},
      visibility: opts.visibility ?? "family",
    });
  } catch {
    // Swallow errors — activity logging should never block the main operation
  }
}
