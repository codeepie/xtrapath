-- ============================================
-- XtraPath: Shares Migration
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS shares (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    post_id TEXT NOT NULL,
    platform TEXT DEFAULT 'link',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shares_post ON shares(post_id);
CREATE INDEX IF NOT EXISTS idx_shares_user_post ON shares(user_id, post_id);

ALTER TABLE shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Shares are viewable by everyone" ON shares;
CREATE POLICY "Shares are viewable by everyone"
    ON shares FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can record a share" ON shares;
CREATE POLICY "Anyone can record a share"
    ON shares FOR INSERT WITH CHECK (true);
