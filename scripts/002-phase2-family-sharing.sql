-- ============================================================================
-- College Quest Phase 2: Family Sharing & Dashboard
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- Prerequisite: 001-parent-student-schema.sql must be applied first
-- ============================================================================

-- 2a. Add sharing visibility to favorite_folders
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE favorite_folders
  ADD COLUMN IF NOT EXISTS shared_with_family BOOLEAN NOT NULL DEFAULT false;

-- 2b. Add privacy controls to family_links
-- Parents can only see what students allow
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE family_links
  ADD COLUMN IF NOT EXISTS can_view_favorites BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS can_view_folders BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS can_view_activity BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;

-- 2c. College notes — family members can leave notes on colleges
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS college_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 2000),
  visibility TEXT NOT NULL DEFAULT 'family'
    CHECK (visibility IN ('private', 'family')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_college_notes_college
  ON college_notes(college_id, user_id);
CREATE INDEX IF NOT EXISTS idx_college_notes_user
  ON college_notes(user_id);

-- 2d. Helper view: active family relationships with profile info
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW family_members AS
SELECT
  fl.id AS link_id,
  fl.parent_id,
  fl.student_id,
  fl.status,
  fl.can_view_favorites,
  fl.can_view_folders,
  fl.can_view_activity,
  fl.created_at,
  fl.accepted_at,
  pp.display_name AS parent_name,
  pp.email AS parent_email,
  pp.avatar_url AS parent_avatar,
  sp.display_name AS student_name,
  sp.email AS student_email,
  sp.avatar_url AS student_avatar,
  sp.graduation_year,
  sp.high_school,
  sp.last_active_at AS student_last_active
FROM family_links fl
JOIN profiles pp ON pp.id = fl.parent_id
JOIN profiles sp ON sp.id = fl.student_id;
