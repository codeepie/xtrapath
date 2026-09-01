-- =========================================================================
-- OPTIONAL: XTRAPATH SUPABASE STORAGE CONFIGURATION FOR BOOKS & MEDIA
-- Run this in your Supabase SQL Editor to enable direct cloud bucket storage
-- =========================================================================

-- 1. Create a public storage bucket named 'books'
INSERT INTO storage.buckets (id, name, public)
VALUES ('books', 'books', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Allow public read access to any object in the 'books' bucket
CREATE POLICY "Public Read Access on Books Bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'books');

-- 3. Allow authenticated users to upload files to 'books' bucket
CREATE POLICY "Authenticated Users Can Upload Books"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'books' 
    AND auth.role() = 'authenticated'
);

-- 4. Allow users to update their own uploads
CREATE POLICY "Users Can Update Their Own Book Uploads"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'books' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 5. Allow users to delete their own uploads
CREATE POLICY "Users Can Delete Their Own Book Uploads"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'books' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);
