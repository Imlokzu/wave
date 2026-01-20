-- Fix Storage Bucket for flux-music
-- Run this in Supabase SQL Editor

-- OPTION 1: Create bucket via Supabase Dashboard (RECOMMENDED)
-- Go to: Storage > Create a new bucket
-- Name: flux-music
-- Public: YES (checked)
-- This automatically sets up proper policies

-- OPTION 2: If you want to use SQL, run these commands:

-- Check if bucket exists
SELECT * FROM storage.buckets WHERE id = 'flux-music';

-- Create bucket if it doesn't exist (public = true for streaming)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'flux-music', 
  'flux-music', 
  true,
  52428800,  -- 50MB limit
  ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/flac', 'audio/ogg', 'audio/aac']
)
ON CONFLICT (id) DO UPDATE 
SET public = true,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/flac', 'audio/ogg', 'audio/aac'];

-- IMPORTANT: Make sure you're using the SERVICE ROLE KEY in your .env file
-- The service role key bypasses RLS policies
-- Check your .env file has:
-- SUPABASE_KEY=eyJhbGc... (should be the service_role key, NOT anon key)

-- If you're using the anon key, you need these policies:

-- Drop existing policies
DROP POLICY IF EXISTS "Public read access for music" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload to music" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update music" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete music" ON storage.objects;

-- Allow public read (for streaming)
CREATE POLICY "Public read access for music"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'flux-music');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated upload to music"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'flux-music');

-- Allow authenticated users to update their files
CREATE POLICY "Authenticated update music"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'flux-music');

-- Allow authenticated users to delete their files
CREATE POLICY "Authenticated delete music"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'flux-music');

-- Verify bucket and policies
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets 
WHERE id = 'flux-music';

SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects' 
  AND policyname LIKE '%music%';
