-- Phase 6: Notifications
-- In-app notification system for family events

CREATE TABLE IF NOT EXISTS notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,  -- 'invite_accepted', 'new_suggestion', 'application_update', 'deadline_reminder', 'family_note'
  title text NOT NULL,
  message text,
  link text,  -- optional link to navigate to
  metadata jsonb DEFAULT '{}'::jsonb,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id) WHERE read = false;

-- Function to count unread notifications (useful for badge)
-- No RLS - using service client
