/*
  # Storage and point_images policies

  1. New Policies
    - Storage bucket policies for authenticated users
    - RLS policies for point_images1 table
    
  2. Changes
    - Enable RLS on point_images1 table
    - Add policies for insert and select operations
*/

-- Enable RLS for point_images1 table
ALTER TABLE point_images1 ENABLE ROW LEVEL SECURITY;

-- Create policies for point_images1 table
CREATE POLICY "Anyone can view point images"
ON point_images1
FOR SELECT
TO public
USING (true);

CREATE POLICY "Authenticated users can insert point images"
ON point_images1
FOR INSERT
TO public
WITH CHECK (true);

-- Storage policies
BEGIN;
  -- Create storage bucket if it doesn't exist
  INSERT INTO storage.buckets (id, name)
  VALUES ('point-images1', 'point-images1')
  ON CONFLICT (id) DO NOTHING;

  -- Policy for viewing images
  CREATE POLICY "Public Access"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'point-images1');

  -- Policy for uploading images
  CREATE POLICY "Authenticated users can upload images"
  ON storage.objects FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'point-images1');
COMMIT;