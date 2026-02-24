-- ============================================================================
-- College Quest Phase 4: Activity Log & Application Tracker
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- Prerequisite: 003-phase3-suggestions.sql must be applied first
-- ============================================================================

-- 4a. Activity log — tracks user actions visible to family
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL
    CHECK (action IN (
      'favorited_college', 'unfavorited_college',
      'added_note', 'updated_application',
      'added_to_folder', 'created_folder',
      'accepted_suggestion'
    )),
  college_id UUID,
  metadata JSONB DEFAULT '{}',
  visibility TEXT NOT NULL DEFAULT 'family'
    CHECK (visibility IN ('family', 'private')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_user
  ON activity_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_family
  ON activity_log(user_id, created_at DESC)
  WHERE visibility = 'family';

-- 4b. College applications — students track application status
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS college_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  college_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'researching'
    CHECK (status IN (
      'researching', 'applying', 'applied',
      'accepted', 'rejected', 'waitlisted', 'deferred',
      'enrolled', 'withdrawn'
    )),
  application_type TEXT
    CHECK (application_type IN ('early_decision', 'early_action', 'regular', 'rolling', NULL)),
  deadline DATE,
  submitted_at TIMESTAMPTZ,
  decision_at TIMESTAMPTZ,
  notes TEXT CHECK (char_length(notes) <= 1000),
  shared_with_family BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, college_id)
);

CREATE INDEX IF NOT EXISTS idx_applications_user
  ON college_applications(user_id, status);
CREATE INDEX IF NOT EXISTS idx_applications_user_shared
  ON college_applications(user_id)
  WHERE shared_with_family = true;
