/*
  # Create trips and points tables

  1. New Tables
    - `trips`
      - `id` (uuid, primary key)
      - `title` (text, required)
      - `description` (text)
      - `user_id` (uuid, required, references auth.users)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `is_draft` (boolean)
      - `country` (text)
    
    - `points`
      - `id` (uuid, primary key)
      - `trip_id` (uuid, references trips)
      - `name` (text, required)
      - `description` (text)
      - `photo_url` (text)
      - `latitude` (double precision)
      - `longitude` (double precision)
      - `order` (integer)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to:
      - Read any published trip
      - Read own draft trips
      - Create/update/delete own trips and points
*/

-- Create trips table
CREATE TABLE trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_draft boolean DEFAULT false,
  country text,
  CONSTRAINT title_length CHECK (char_length(title) <= 50),
  CONSTRAINT description_length CHECK (char_length(description) <= 500)
);

-- Create points table
CREATE TABLE points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  photo_url text,
  latitude double precision,
  longitude double precision,
  "order" integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT name_length CHECK (char_length(name) <= 50),
  CONSTRAINT description_length CHECK (char_length(description) <= 300)
);

-- Enable RLS
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE points ENABLE ROW LEVEL SECURITY;

-- Policies for trips
CREATE POLICY "Anyone can read published trips"
  ON trips
  FOR SELECT
  USING (NOT is_draft);

CREATE POLICY "Users can read own draft trips"
  ON trips
  FOR SELECT
  USING (auth.uid() = user_id AND is_draft);

CREATE POLICY "Users can create own trips"
  ON trips
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trips"
  ON trips
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trips"
  ON trips
  FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for points
CREATE POLICY "Anyone can read points of published trips"
  ON points
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = points.trip_id
      AND NOT trips.is_draft
    )
  );

CREATE POLICY "Users can read points of own draft trips"
  ON points
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = points.trip_id
      AND trips.user_id = auth.uid()
      AND trips.is_draft
    )
  );

CREATE POLICY "Users can create points for own trips"
  ON points
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = points.trip_id
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update points of own trips"
  ON points
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = points.trip_id
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete points of own trips"
  ON points
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = points.trip_id
      AND trips.user_id = auth.uid()
    )
  );