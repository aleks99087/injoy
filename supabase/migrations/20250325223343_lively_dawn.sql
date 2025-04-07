/*
  # Add trip budget and dates

  1. New Columns
    - `budget` (integer)
    - `start_date` (date)
    - `end_date` (date)
    Added to the trips table

  2. Changes
    - Added NOT NULL constraint to ensure required fields
    - Added CHECK constraint to validate budget is positive
    - Added CHECK constraint to ensure end_date is after start_date
*/

ALTER TABLE trips
ADD COLUMN budget integer NOT NULL DEFAULT 0,
ADD COLUMN start_date date NOT NULL DEFAULT CURRENT_DATE,
ADD COLUMN end_date date NOT NULL DEFAULT CURRENT_DATE;

-- Add constraints
ALTER TABLE trips
ADD CONSTRAINT budget_positive CHECK (budget >= 0),
ADD CONSTRAINT valid_dates CHECK (end_date >= start_date);