-- ============================================================================
-- College Quest Phase 3: College Suggestions
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- Prerequisite: 002-phase2-family-sharing.sql must be applied first
-- ============================================================================

-- 3a. College suggestions — parents suggest colleges to students
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS college_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id UUID NOT NULL,
  from_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  note TEXT CHECK (char_length(note) <= 500),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  UNIQUE (college_id, from_user_id, to_user_id)
);

CREATE INDEX IF NOT EXISTS idx_suggestions_to_user
  ON college_suggestions(to_user_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_suggestions_from_user
  ON college_suggestions(from_user_id);
