/*
  # Add point_images table and update points table

  1. New Tables
    - `point_images`
      - `id` (uuid, primary key)
      - `point_id` (uuid, references points)
      - `url` (text, required)
      - `order` (integer)
      - `created_at` (timestamp)

  2. Changes to points table
    - Add `rating` column (integer, 1-5)

  3. Security
    - Enable RLS on point_images table
    - Add policies matching points table access
*/

-- Create point_images table
CREATE TABLE point_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  point_id uuid NOT NULL REFERENCES points(id) ON DELETE CASCADE,
  url text NOT NULL,
  "order" integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Add rating to points
ALTER TABLE points ADD COLUMN rating integer CHECK (rating >= 1 AND rating <= 5);

-- Enable RLS
ALTER TABLE point_images ENABLE ROW LEVEL SECURITY;

-- Policies for point_images (matching points policies)
CREATE POLICY "Anyone can read images of published trips"
  ON point_images
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM points
      JOIN trips ON trips.id = points.trip_id
      WHERE points.id = point_images.point_id
      AND NOT trips.is_draft
    )
  );

CREATE POLICY "Users can read images of own draft trips"
  ON point_images
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM points
      JOIN trips ON trips.id = points.trip_id
      WHERE points.id = point_images.point_id
      AND trips.user_id = auth.uid()
      AND trips.is_draft
    )
  );

CREATE POLICY "Users can create images for own trips"
  ON point_images
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM points
      JOIN trips ON trips.id = points.trip_id
      WHERE points.id = point_images.point_id
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update images of own trips"
  ON point_images
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM points
      JOIN trips ON trips.id = points.trip_id
      WHERE points.id = point_images.point_id
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete images of own trips"
  ON point_images
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM points
      JOIN trips ON trips.id = points.trip_id
      WHERE points.id = point_images.point_id
      AND trips.user_id = auth.uid()
    )
  );