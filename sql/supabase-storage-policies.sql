-- Flux Messenger - Storage Bucket Policies
-- Run this in Supabase SQL Editor AFTER creating the storage buckets
-- Make sure you've created these buckets first: flux-images, flux-files, flux-voice

-- ============================================
-- FLUX-IMAGES BUCKET POLICIES
-- ============================================

-- Allow public read access to images
CREATE POLICY "flux-images: Public Read" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'flux-images');

-- Allow public upload of images
CREATE POLICY "flux-images: Public Upload" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'flux-images');

-- Allow public update of images
CREATE POLICY "flux-images: Public Update" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'flux-images');

-- Allow public delete of images
CREATE POLICY "flux-images: Public Delete" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'flux-images');

-- ============================================
-- FLUX-FILES BUCKET POLICIES
-- ============================================

-- Allow public read access to files
CREATE POLICY "flux-files: Public Read" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'flux-files');

-- Allow public upload of files
CREATE POLICY "flux-files: Public Upload" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'flux-files');

-- Allow public update of files
CREATE POLICY "flux-files: Public Update" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'flux-files');

-- Allow public delete of files
CREATE POLICY "flux-files: Public Delete" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'flux-files');

-- ============================================
-- FLUX-VOICE BUCKET POLICIES
-- ============================================

-- Allow public read access to voice messages
CREATE POLICY "flux-voice: Public Read" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'flux-voice');

-- Allow public upload of voice messages
CREATE POLICY "flux-voice: Public Upload" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'flux-voice');

-- Allow public update of voice messages
CREATE POLICY "flux-voice: Public Update" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'flux-voice');

-- Allow public delete of voice messages
CREATE POLICY "flux-voice: Public Delete" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'flux-voice');

-- ============================================
-- VERIFICATION
-- ============================================

-- Run this to verify all policies were created:
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE 'flux-%'
ORDER BY policyname;

-- You should see 12 policies total (4 for each bucket)
