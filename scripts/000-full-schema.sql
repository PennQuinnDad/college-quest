-- ============================================================================
-- College Quest: COMPLETE DATABASE SCHEMA (Fresh Install)
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================================

-- ============================================================================
-- BASE TABLES
-- ============================================================================

-- Profiles (user accounts)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user'
    CHECK (role IN ('user', 'admin')),
  account_type TEXT NOT NULL DEFAULT 'student'
    CHECK (account_type IN ('student', 'parent')),
  graduation_year INTEGER,
  high_school TEXT,
  profile_completed BOOLEAN NOT NULL DEFAULT false,
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Allowed emails (whitelist for signup)
CREATE TABLE IF NOT EXISTS allowed_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  suggested_account_type TEXT
    CHECK (suggested_account_type IN ('student', 'parent')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_allowed_emails_email ON allowed_emails(email);

-- Colleges (main college data, ~5,000 records)
CREATE TABLE IF NOT EXISTS colleges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT,
  website TEXT,
  region TEXT,
  category TEXT,
  type TEXT,
  size TEXT,
  enrollment INTEGER,
  tuition_in_state INTEGER,
  tuition_out_of_state INTEGER,
  net_cost INTEGER,
  net_pricing_guidance TEXT,
  acceptance_rate NUMERIC(5,2),
  sat_math INTEGER,
  sat_reading INTEGER,
  act_composite INTEGER,
  graduation_rate NUMERIC(5,2),
  programs TEXT[],
  description TEXT,
  image_url TEXT,
  jesuit BOOLEAN NOT NULL DEFAULT false,
  scorecard_id TEXT,
  latitude NUMERIC(10,6),
  longitude NUMERIC(10,6),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_colleges_name ON colleges(name);
CREATE INDEX IF NOT EXISTS idx_colleges_state ON colleges(state);
CREATE INDEX IF NOT EXISTS idx_colleges_region ON colleges(region);
CREATE INDEX IF NOT EXISTS idx_colleges_type ON colleges(type);
CREATE INDEX IF NOT EXISTS idx_colleges_size ON colleges(size);
CREATE INDEX IF NOT EXISTS idx_colleges_acceptance_rate ON colleges(acceptance_rate);
CREATE INDEX IF NOT EXISTS idx_colleges_tuition_in_state ON colleges(tuition_in_state);
CREATE INDEX IF NOT EXISTS idx_colleges_enrollment ON colleges(enrollment);
CREATE INDEX IF NOT EXISTS idx_colleges_jesuit ON colleges(jesuit);
CREATE INDEX IF NOT EXISTS idx_colleges_location ON colleges(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_colleges_programs ON colleges USING GIN(programs);

-- Schools (academic programs offered at colleges)
CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  cip_code TEXT,
  website TEXT,
  description TEXT,
  source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'enriched')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_schools_college_id ON schools(college_id);
CREATE INDEX IF NOT EXISTS idx_schools_category ON schools(category);
CREATE INDEX IF NOT EXISTS idx_schools_name ON schools(name);

-- Favorites (user's favorite colleges)
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  college_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, college_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_college_id ON favorites(college_id);

-- Favorite folders (organize favorites into custom collections)
CREATE TABLE IF NOT EXISTS favorite_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  shared_with_family BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_favorite_folders_user_id ON favorite_folders(user_id);

-- Favorite folder items (colleges within a folder)
CREATE TABLE IF NOT EXISTS favorite_folder_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID NOT NULL REFERENCES favorite_folders(id) ON DELETE CASCADE,
  college_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (folder_id, college_id)
);

CREATE INDEX IF NOT EXISTS idx_favorite_folder_items_folder_id ON favorite_folder_items(folder_id);
CREATE INDEX IF NOT EXISTS idx_favorite_folder_items_college_id ON favorite_folder_items(college_id);

-- College resources (links and files for each college)
CREATE TABLE IF NOT EXISTS college_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'link'
    CHECK (type IN ('link', 'file')),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  url TEXT,
  storage_path TEXT,
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_college_resources_college_id ON college_resources(college_id);
CREATE INDEX IF NOT EXISTS idx_college_resources_type ON college_resources(type);
CREATE INDEX IF NOT EXISTS idx_college_resources_category ON college_resources(category);

-- ============================================================================
-- PHASE 1: FAMILY MANAGEMENT
-- ============================================================================

-- Family links (parent↔student relationships)
CREATE TABLE IF NOT EXISTS family_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'revoked')),
  can_view_favorites BOOLEAN NOT NULL DEFAULT true,
  can_view_folders BOOLEAN NOT NULL DEFAULT true,
  can_view_activity BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  UNIQUE (parent_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_family_links_parent
  ON family_links(parent_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_family_links_student
  ON family_links(student_id) WHERE status = 'active';

-- Family invites (email-based invitations)
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

-- ============================================================================
-- PHASE 2: FAMILY SHARING
-- ============================================================================

-- College notes (family members can leave notes on colleges)
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

-- Helper view: active family relationships with profile info
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

-- ============================================================================
-- PHASE 3: COLLEGE SUGGESTIONS
-- ============================================================================

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

-- ============================================================================
-- PHASE 4: ACTIVITY LOG & APPLICATION TRACKER
-- ============================================================================

-- Activity log
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

-- College applications
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

-- ============================================================================
-- PHASE 6: NOTIFICATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  metadata JSONB DEFAULT '{}',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id) WHERE read = false;

-- ============================================================================
-- RLS POLICIES (disable RLS — app uses service_role client for all queries)
-- ============================================================================
-- Note: Our app uses createServiceClient() which bypasses RLS entirely.
-- RLS is enabled but with permissive policies as a safety net.

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE allowed_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE colleges ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_folder_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE college_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE college_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE college_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE college_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Public read access for colleges (needed for non-authenticated browsing)
CREATE POLICY "Public read colleges" ON colleges FOR SELECT USING (true);
CREATE POLICY "Public read schools" ON schools FOR SELECT USING (true);
CREATE POLICY "Public read college_resources" ON college_resources FOR SELECT USING (true);

-- ============================================================================
-- DONE! Next steps:
-- 1. Configure Google & GitHub OAuth in Auth → Providers
-- 2. Set Site URL to https://college.pennquinn.com in Auth → URL Configuration
-- 3. Add redirect URL: https://college.pennquinn.com/auth/callback
-- 4. Import college data
-- ============================================================================
