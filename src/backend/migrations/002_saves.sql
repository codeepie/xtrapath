-- ============================================
-- XtraPath: Saves / Bookmarks Migration
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS saves (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    post_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_saves_user_post ON saves(user_id, post_id);
CREATE INDEX IF NOT EXISTS idx_saves_post ON saves(post_id);

ALTER TABLE saves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Saves are viewable by everyone" ON saves;
CREATE POLICY "Saves are viewable by everyone"
    ON saves FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can save posts" ON saves;
CREATE POLICY "Users can save posts"
    ON saves FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unsave posts" ON saves;
CREATE POLICY "Users can unsave posts"
    ON saves FOR DELETE USING (auth.uid() = user_id);
