/*
  # Add missing columns to trips table

  1. Changes
    - Add `photo_url` column to store trip cover photo
    - Add `likes` and `comments` columns for social features
    - Set default values for new columns

  2. Security
    - No changes to RLS policies needed
*/

DO $$ BEGIN
  -- Add photo_url column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'photo_url'
  ) THEN
    ALTER TABLE trips ADD COLUMN photo_url text;
  END IF;

  -- Add likes column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'likes'
  ) THEN
    ALTER TABLE trips ADD COLUMN likes integer NOT NULL DEFAULT 0;
  END IF;

  -- Add comments column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'comments'
  ) THEN
    ALTER TABLE trips ADD COLUMN comments integer NOT NULL DEFAULT 0;
  END IF;
END $$;