-- Add starting/ending location fields to tour_days
ALTER TABLE tour_days
  ADD COLUMN start_location TEXT,
  ADD COLUMN start_travel_min INTEGER,
  ADD COLUMN end_location TEXT,
  ADD COLUMN end_travel_min INTEGER;
