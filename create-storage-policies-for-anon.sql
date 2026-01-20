-- Storage policies for anon key
-- Run this in Supabase SQL Editor if you want to keep using anon key

-- Make sure bucket exists and is public
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('flux-music', 'flux-music', true, 52428800)
ON CONFLICT (id) DO UPDATE 
SET public = true, file_size_limit = 52428800;

-- Drop all existing policies for this bucket
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
    END LOOP;
END $$;

-- Create new permissive policies that allow anon key to work
CREATE POLICY "Allow all operations on flux-music"
ON storage.objects
FOR ALL
TO public, anon, authenticated
USING (bucket_id = 'flux-music')
WITH CHECK (bucket_id = 'flux-music');

-- Verify
SELECT 
    id,
    name,
    public,
    file_size_limit
FROM storage.buckets 
WHERE id = 'flux-music';

SELECT 
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE schemaname = 'storage' 
AND tablename = 'objects';
