-- ============================================
-- XtraPath: Follow & Following System Migration
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_follows (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    following_id TEXT NOT NULL,
    creator_username TEXT,
    creator_fullname TEXT,
    creator_avatar TEXT,
    follower_username TEXT,
    follower_fullname TEXT,
    follower_avatar TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(follower_id, following_id)
);

CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON public.user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON public.user_follows(following_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_pair ON public.user_follows(follower_id, following_id);

ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view follows (for follower/following counts, status, and lists)
DROP POLICY IF EXISTS "Follows are viewable by everyone" ON public.user_follows;
CREATE POLICY "Follows are viewable by everyone"
    ON public.user_follows FOR SELECT USING (true);

-- Allow authenticated users to follow creators
DROP POLICY IF EXISTS "Users can follow creators" ON public.user_follows;
CREATE POLICY "Users can follow creators"
    ON public.user_follows FOR INSERT WITH CHECK (auth.uid() = follower_id);

-- Allow authenticated users to unfollow creators
DROP POLICY IF EXISTS "Users can unfollow creators" ON public.user_follows;
CREATE POLICY "Users can unfollow creators"
    ON public.user_follows FOR DELETE USING (auth.uid() = follower_id);

-- Allow users to update their follow metadata
DROP POLICY IF EXISTS "Users can update their follows" ON public.user_follows;
CREATE POLICY "Users can update their follows"
    ON public.user_follows FOR UPDATE USING (auth.uid() = follower_id);
