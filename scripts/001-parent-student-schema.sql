-- ============================================================================
-- College Quest: Parent/Student Management Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================================

-- 1a. Extend profiles table with account type and student details
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS account_type TEXT NOT NULL DEFAULT 'student'
    CHECK (account_type IN ('student', 'parent')),
  ADD COLUMN IF NOT EXISTS graduation_year INTEGER,
  ADD COLUMN IF NOT EXISTS high_school TEXT,
  ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;

-- Mark all existing users as profile-completed (they don't need onboarding)
UPDATE profiles SET profile_completed = true WHERE profile_completed = false;

-- 1b. Create family_links table (parent↔student relationships)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS family_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  UNIQUE (parent_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_family_links_parent
  ON family_links(parent_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_family_links_student
  ON family_links(student_id) WHERE status = 'active';

-- 1c. Create family_invites table (email-based invitations)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS family_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  inviter_type TEXT NOT NULL CHECK (inviter_type IN ('parent', 'student')),
  invited_email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  claimed BOOLEAN NOT NULL DEFAULT false,
  claimed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_family_invites_email
  ON family_invites(invited_email) WHERE NOT claimed;
CREATE INDEX IF NOT EXISTS idx_family_invites_token
  ON family_invites(token) WHERE NOT claimed;

-- 1d. Add suggested_account_type to allowed_emails
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE allowed_emails
  ADD COLUMN IF NOT EXISTS suggested_account_type TEXT
    CHECK (suggested_account_type IN ('student', 'parent'));
