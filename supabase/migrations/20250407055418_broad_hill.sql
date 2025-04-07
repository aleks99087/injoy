/*
  # Add trip visibility control

  1. Changes
    - Added `is_public` column to trips table
    - Default value is true for backward compatibility
    - Added NOT NULL constraint

  2. Security
    - Updated RLS policy to check visibility
*/

ALTER TABLE trips
ADD COLUMN is_public boolean NOT NULL DEFAULT true;

-- Update RLS policy to check visibility
CREATE POLICY "Anyone can view public trips"
ON trips
FOR SELECT
TO public
USING (
  is_public = true OR
  auth.uid()::text = user_id
);