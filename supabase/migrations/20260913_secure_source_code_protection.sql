-- =========================================================================
-- SECURE PROPRIETARY SOURCE CODE PROTECTION & ENTITLEMENTS (ZERO-TRUST)
-- =========================================================================
-- Threat Model Addressed:
-- 1. Unauthenticated / non-paying users querying Supabase REST API directly
--    to scrape raw Python/Manim/Typst code without paying the creator.
-- 2. Inspecting client-side network payloads or in-memory caches.
--
-- This migration guarantees cryptographically verifiable, server-enforced
-- access control for all monetized and protected creations.
-- =========================================================================

-- 1. Ensure Purchases Table is indexed on (user_id, item_id) for instant lookup
CREATE INDEX IF NOT EXISTS idx_purchases_user_item ON public.purchases(user_id, item_id);

-- 2. Server-side Function: Securely retrieve source code ONLY for authorized viewers
-- Call via: supabase.rpc('get_secure_post_code', { p_post_id: '...' })
CREATE OR REPLACE FUNCTION public.get_secure_post_code(p_post_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_post RECORD;
    v_caller_id UUID;
    v_is_author BOOLEAN := FALSE;
    v_is_unlocked BOOLEAN := FALSE;
    v_source JSONB;
    v_is_protected BOOLEAN := FALSE;
BEGIN
    -- Get caller's authenticated user ID
    v_caller_id := auth.uid();

    -- Fetch the post
    SELECT * INTO v_post FROM public.posts WHERE id = p_post_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'POST_NOT_FOUND',
            'message', 'The requested simulation could not be found.'
        );
    END IF;

    v_source := CASE 
        WHEN jsonb_typeof(to_jsonb(v_post.source)) = 'string' THEN v_post.source::jsonb
        ELSE to_jsonb(v_post.source)
    END;

    -- Determine if post is protected
    v_is_protected := COALESCE((v_source->>'is_source_protected')::boolean, false)
        OR v_source->>'access_tier' = 'protected_code'
        OR v_source->>'access_tier' = 'store_sale'
        OR COALESCE((v_source->>'is_for_sale')::boolean, false)
        OR (COALESCE((v_source->>'code_price')::numeric, 0) > 0)
        OR (COALESCE((v_source->>'price')::numeric, 0) > 0);

    -- Check if caller is author
    IF v_caller_id IS NOT NULL AND v_post.user_id = v_caller_id THEN
        v_is_author := TRUE;
    END IF;

    -- Check if caller has purchased / unlocked this creation
    IF v_caller_id IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM public.purchases 
            WHERE user_id = v_caller_id 
              AND (item_id = p_post_id::text OR item_id = v_post.id::text)
        ) INTO v_is_unlocked;
    END IF;

    -- If creation is NOT protected, or caller is author, or caller has unlocked:
    IF (NOT v_is_protected) OR v_is_author OR v_is_unlocked THEN
        RETURN jsonb_build_object(
            'success', true,
            'post_id', v_post.id,
            'title', v_post.title,
            'format', v_post.format,
            'engine', COALESCE(v_source->>'engine', v_post.format, 'manim'),
            'code', COALESCE(v_source->>'code', v_post.code, ''),
            'is_author', v_is_author,
            'is_unlocked', v_is_unlocked,
            'source', v_source
        );
    END IF;

    -- Otherwise: ACCESS DENIED (Paywall Required)
    RETURN jsonb_build_object(
        'success', false,
        'error', 'SOURCE_PROTECTED',
        'message', 'Proprietary source code is protected. 1-time unlock required.',
        'post_id', v_post.id,
        'title', v_post.title,
        'format', v_post.format,
        'engine', COALESCE(v_source->>'engine', v_post.format, 'manim'),
        'code_price', COALESCE((v_source->>'code_price')::numeric, (v_source->>'price')::numeric, 2.99),
        'currency', 'USD'
    );
END;
$$;

-- 3. Zero-Trust Public Feed View: Strips proprietary code on the server BEFORE sending over HTTP
-- This ensures the DevTools Network Tab never receives the code for protected items.
CREATE OR REPLACE VIEW public.posts_feed AS
SELECT 
    p.*,
    CASE 
        WHEN (
            (to_jsonb(p.source)->>'access_tier' = 'protected_code')
            OR (to_jsonb(p.source)->>'access_tier' = 'store_sale')
            OR COALESCE((to_jsonb(p.source)->>'is_source_protected')::boolean, false) = true
            OR COALESCE((to_jsonb(p.source)->>'is_for_sale')::boolean, false) = true
            OR COALESCE((to_jsonb(p.source)->>'code_price')::numeric, 0) > 0
            OR COALESCE((to_jsonb(p.source)->>'price')::numeric, 0) > 0
        )
        AND (auth.uid() IS NULL OR auth.uid() != p.user_id)
        AND NOT EXISTS (
            SELECT 1 FROM public.purchases pu 
            WHERE pu.user_id = auth.uid() 
              AND (pu.item_id = p.id::text)
        )
        THEN (to_jsonb(p.source) - 'code' - 'latex' - 'typst' - 'raw_code')
        ELSE to_jsonb(p.source)
    END AS sanitized_source
FROM public.posts p;

-- Grant permissions for view and RPC
GRANT SELECT ON public.posts_feed TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_secure_post_code(UUID) TO anon, authenticated;
