-- Add departure time and geocoded coordinates for start/end locations
ALTER TABLE tour_days
  ADD COLUMN departure_time INTEGER,       -- minutes from midnight, e.g. 540 = 9:00 AM
  ADD COLUMN start_latitude DOUBLE PRECISION,
  ADD COLUMN start_longitude DOUBLE PRECISION,
  ADD COLUMN end_latitude DOUBLE PRECISION,
  ADD COLUMN end_longitude DOUBLE PRECISION;
