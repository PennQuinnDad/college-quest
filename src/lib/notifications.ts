import { createServiceClient } from "@/lib/supabase/server";

export type NotificationType =
  | "invite_accepted"
  | "new_suggestion"
  | "application_update"
  | "deadline_reminder"
  | "family_note";

/**
 * Fire-and-forget notification creator.
 * Errors are swallowed so callers aren't blocked.
 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  opts: {
    message?: string;
    link?: string;
    metadata?: Record<string, unknown>;
  } = {},
) {
  try {
    const service = createServiceClient();
    await service.from("notifications").insert({
      user_id: userId,
      type,
      title,
      message: opts.message ?? null,
      link: opts.link ?? null,
      metadata: opts.metadata ?? {},
    });
  } catch {
    // Swallow – notifications are non-critical
  }
}
