-- =========================================================================
-- XTRAPATH SUPABASE STORAGE CONFIGURATION FOR VIDEOS & MEDIA
-- Run this in your Supabase SQL Editor to allow direct public & authenticated uploads
-- =========================================================================

-- 1. Ensure public storage bucket named 'videos' exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Allow public read access to any object in the 'videos' bucket
DROP POLICY IF EXISTS "Public Read Access on Videos Bucket" ON storage.objects;
CREATE POLICY "Public Read Access on Videos Bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'videos');

-- 3. Allow uploads (INSERT) to 'videos' bucket for both authenticated & anon roles
DROP POLICY IF EXISTS "Allow Uploads to Videos Bucket" ON storage.objects;
CREATE POLICY "Allow Uploads to Videos Bucket"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'videos');

-- 4. Allow updates to 'videos' bucket
DROP POLICY IF EXISTS "Allow Updates to Videos Bucket" ON storage.objects;
CREATE POLICY "Allow Updates to Videos Bucket"
ON storage.objects FOR UPDATE
USING (bucket_id = 'videos');
