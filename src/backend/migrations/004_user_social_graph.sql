-- ==========================================================
-- 004_user_social_graph.sql
-- Production Instagram-Grade User Model & Follow Graph
-- ==========================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";

-- 1. USERS PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username CITEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL DEFAULT '',
    bio VARCHAR(250) DEFAULT '',
    website TEXT DEFAULT '',
    avatar_url TEXT DEFAULT '',
    cover_url TEXT DEFAULT '',
    
    -- Badges & Roles
    is_verified BOOLEAN DEFAULT FALSE,
    is_pro BOOLEAN DEFAULT FALSE,
    is_private BOOLEAN DEFAULT FALSE,
    role VARCHAR(30) DEFAULT 'member', -- 'member', 'creator', 'moderator', 'admin'
    
    -- Atomic Counters (Maintained via triggers)
    followers_count INTEGER NOT NULL DEFAULT 0 CHECK (followers_count >= 0),
    following_count INTEGER NOT NULL DEFAULT 0 CHECK (following_count >= 0),
    posts_count     INTEGER NOT NULL DEFAULT 0 CHECK (posts_count >= 0),
    likes_count     INTEGER NOT NULL DEFAULT 0 CHECK (likes_count >= 0),
    
    -- Safety & Timestamps
    is_banned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Format validation for Instagram-style usernames (blocks 'xtra*' prefix for platform accounts)
    CONSTRAINT valid_username_format CHECK (
        username ~ '^[a-zA-Z0-9._]{3,30}$' AND 
        username NOT LIKE '.%' AND 
        username NOT LIKE '%.' AND 
        username NOT LIKE '%..%' AND
        username NOT ILIKE 'xtra%'
    )
);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles (username);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles (created_at DESC);

-- 2. SOCIAL GRAPH: FOLLOWS TABLE
CREATE TABLE IF NOT EXISTS public.follows (
    follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'accepted', -- 'accepted', 'pending'
    created_at TIMESTAMPTZ DEFAULT NOW(),

    PRIMARY KEY (follower_id, following_id),
    CONSTRAINT no_self_follow CHECK (follower_id <> following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON public.follows (follower_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON public.follows (following_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_follows_status ON public.follows (status);

-- 3. USER BLOCKS & MUTES
CREATE TABLE IF NOT EXISTS public.user_blocks (
    blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (blocker_id, blocked_id),
    CONSTRAINT no_self_block CHECK (blocker_id <> blocked_id)
);

-- 4. ATOMIC COUNTER UPDATE TRIGGER
CREATE OR REPLACE FUNCTION public.handle_follow_count_update()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        IF (NEW.status = 'accepted') THEN
            UPDATE public.profiles
            SET followers_count = followers_count + 1
            WHERE id = NEW.following_id;

            UPDATE public.profiles
            SET following_count = following_count + 1
            WHERE id = NEW.follower_id;
        END IF;
        RETURN NEW;

    ELSIF (TG_OP = 'DELETE') THEN
        IF (OLD.status = 'accepted') THEN
            UPDATE public.profiles
            SET followers_count = GREATEST(0, followers_count - 1)
            WHERE id = OLD.following_id;

            UPDATE public.profiles
            SET following_count = GREATEST(0, following_count - 1)
            WHERE id = OLD.follower_id;
        END IF;
        RETURN OLD;

    ELSIF (TG_OP = 'UPDATE') THEN
        IF (OLD.status = 'pending' AND NEW.status = 'accepted') THEN
            UPDATE public.profiles SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
            UPDATE public.profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
        END IF;
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_follows_count ON public.follows;
CREATE TRIGGER trg_follows_count
AFTER INSERT OR DELETE OR UPDATE ON public.follows
FOR EACH ROW EXECUTE FUNCTION public.handle_follow_count_update();

-- 5. ROW-LEVEL SECURITY POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public profiles are readable by everyone') THEN
        CREATE POLICY "Public profiles are readable by everyone" ON public.profiles FOR SELECT USING (is_banned = FALSE);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own profile') THEN
        CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view accepted follows') THEN
        CREATE POLICY "Anyone can view accepted follows" ON public.follows FOR SELECT USING (status = 'accepted' OR auth.uid() = follower_id OR auth.uid() = following_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can follow') THEN
        CREATE POLICY "Authenticated users can follow" ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can unfollow') THEN
        CREATE POLICY "Users can unfollow" ON public.follows FOR DELETE USING (auth.uid() = follower_id);
    END IF;
END $$;
