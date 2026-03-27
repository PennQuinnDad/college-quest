-- ============================================================================
-- 006: Campus Tours
-- Enables users to create day-by-day college visit itineraries from favorites.
-- ============================================================================

-- Tours (trip header with metadata)
CREATE TABLE IF NOT EXISTS tours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) <= 200),
  start_date DATE,
  end_date DATE,
  notes TEXT CHECK (char_length(notes) <= 5000),
  travel_notes TEXT CHECK (char_length(travel_notes) <= 5000),
  shared_with_family BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tours_user_id ON tours(user_id);

ALTER TABLE tours ENABLE ROW LEVEL SECURITY;

-- Tour days (each day in the itinerary)
CREATE TABLE IF NOT EXISTS tour_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  title TEXT CHECK (char_length(title) <= 200),
  date DATE,
  notes TEXT CHECK (char_length(notes) <= 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tour_days_tour_id ON tour_days(tour_id);

ALTER TABLE tour_days ENABLE ROW LEVEL SECURITY;

-- Tour stops (individual college visits within a day)
CREATE TABLE IF NOT EXISTS tour_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_day_id UUID NOT NULL REFERENCES tour_days(id) ON DELETE CASCADE,
  college_id UUID NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  visit_time TEXT CHECK (char_length(visit_time) <= 50),
  notes TEXT CHECK (char_length(notes) <= 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tour_stops_tour_day_id ON tour_stops(tour_day_id);
CREATE INDEX IF NOT EXISTS idx_tour_stops_college_id ON tour_stops(college_id);

ALTER TABLE tour_stops ENABLE ROW LEVEL SECURITY;
