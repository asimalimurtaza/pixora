-- Pixora Phase 3 Migration: Feed, Explore, Search, Blocking & Discovery

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. BLOCKING TRIGGER & CLEANUP FUNCTION
CREATE OR REPLACE FUNCTION public.handle_block_cleanup()
RETURNS TRIGGER AS $$
BEGIN
    -- Delete existing follow relationships in both directions
    DELETE FROM public.follows
    WHERE (follower_id = NEW.blocker_id AND following_id = NEW.blocked_id)
       OR (follower_id = NEW.blocked_id AND following_id = NEW.blocker_id);

    -- Delete pending follow requests in both directions
    DELETE FROM public.follow_requests
    WHERE (requester_id = NEW.blocker_id AND target_user_id = NEW.blocked_id)
       OR (requester_id = NEW.blocked_id AND target_user_id = NEW.blocker_id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_block_created ON public.blocks;
CREATE TRIGGER on_block_created
    AFTER INSERT ON public.blocks
    FOR EACH ROW EXECUTE FUNCTION public.handle_block_cleanup();

-- 3. CURSOR-BASED HOME FEED FUNCTION
CREATE OR REPLACE FUNCTION public.get_home_feed(
    p_user_id UUID,
    p_limit INT DEFAULT 10,
    p_cursor_created_at TIMESTAMPTZ DEFAULT NULL,
    p_cursor_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    caption TEXT,
    visibility TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.user_id,
        p.caption,
        p.visibility,
        p.created_at,
        p.updated_at
    FROM public.posts p
    WHERE 
        -- User's own posts OR posts from followed users
        (
            p.user_id = p_user_id 
            OR p.user_id IN (SELECT following_id FROM public.follows WHERE follower_id = p_user_id)
        )
        -- Exclude blocked users (in either direction)
        AND p.user_id NOT IN (
            SELECT blocked_id FROM public.blocks WHERE blocker_id = p_user_id
            UNION
            SELECT blocker_id FROM public.blocks WHERE blocked_id = p_user_id
        )
        -- Cursor pagination filter (deterministic tuple comparison)
        AND (
            p_cursor_created_at IS NULL 
            OR p.created_at < p_cursor_created_at 
            OR (p.created_at = p_cursor_created_at AND p.id < p_cursor_id)
        )
    ORDER BY p.created_at DESC, p.id DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- 4. CURSOR-BASED EXPLORE FEED FUNCTION
CREATE OR REPLACE FUNCTION public.get_explore_feed(
    p_viewer_id UUID DEFAULT NULL,
    p_limit INT DEFAULT 18,
    p_cursor_created_at TIMESTAMPTZ DEFAULT NULL,
    p_cursor_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    caption TEXT,
    visibility TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.user_id,
        p.caption,
        p.visibility,
        p.created_at,
        p.updated_at
    FROM public.posts p
    JOIN public.profiles pr ON pr.id = p.user_id
    WHERE 
        -- Only public posts from non-private accounts
        p.visibility = 'public'
        AND pr.is_private = FALSE
        -- Exclude viewer's own posts from explore if desired
        AND (p_viewer_id IS NULL OR p.user_id <> p_viewer_id)
        -- Exclude blocked accounts if viewer is logged in
        AND (
            p_viewer_id IS NULL 
            OR p.user_id NOT IN (
                SELECT blocked_id FROM public.blocks WHERE blocker_id = p_viewer_id
                UNION
                SELECT blocker_id FROM public.blocks WHERE blocked_id = p_viewer_id
            )
        )
        -- Cursor pagination filter
        AND (
            p_cursor_created_at IS NULL 
            OR p.created_at < p_cursor_created_at 
            OR (p.created_at = p_cursor_created_at AND p.id < p_cursor_id)
        )
    ORDER BY p.created_at DESC, p.id DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- 5. TRENDING POSTS FUNCTION (Engagement Score Ranking)
CREATE OR REPLACE FUNCTION public.get_trending_posts(
    p_viewer_id UUID DEFAULT NULL,
    p_limit INT DEFAULT 18
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    caption TEXT,
    visibility TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    engagement_score NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.user_id,
        p.caption,
        p.visibility,
        p.created_at,
        p.updated_at,
        ROUND(
            (
                (SELECT COUNT(*) FROM public.likes l WHERE l.post_id = p.id) * 2 +
                (SELECT COUNT(*) FROM public.comments c WHERE c.post_id = p.id) * 3 + 1
            )::NUMERIC / 
            POWER((EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600.0 + 2.0), 1.5)::NUMERIC,
            4
        ) AS engagement_score
    FROM public.posts p
    JOIN public.profiles pr ON pr.id = p.user_id
    WHERE 
        p.visibility = 'public'
        AND pr.is_private = FALSE
        AND p.created_at > (NOW() - INTERVAL '30 days')
        AND (
            p_viewer_id IS NULL 
            OR p.user_id NOT IN (
                SELECT blocked_id FROM public.blocks WHERE blocker_id = p_viewer_id
                UNION
                SELECT blocker_id FROM public.blocks WHERE blocked_id = p_viewer_id
            )
        )
    ORDER BY engagement_score DESC, p.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- 6. USER SUGGESTIONS FUNCTION
CREATE OR REPLACE FUNCTION public.get_suggested_users(
    p_user_id UUID,
    p_limit INT DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    username TEXT,
    display_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    mutual_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pr.id,
        pr.username,
        pr.display_name,
        pr.avatar_url,
        pr.bio,
        COUNT(f2.follower_id) AS mutual_count
    FROM public.profiles pr
    -- Find accounts followed by people p_user_id follows
    JOIN public.follows f2 ON f2.following_id = pr.id
    WHERE 
        f2.follower_id IN (SELECT following_id FROM public.follows WHERE follower_id = p_user_id)
        AND pr.id <> p_user_id
        -- Exclude already followed
        AND pr.id NOT IN (SELECT following_id FROM public.follows WHERE follower_id = p_user_id)
        -- Exclude blocked users
        AND pr.id NOT IN (
            SELECT blocked_id FROM public.blocks WHERE blocker_id = p_user_id
            UNION
            SELECT blocker_id FROM public.blocks WHERE blocked_id = p_user_id
        )
    GROUP BY pr.id, pr.username, pr.display_name, pr.avatar_url, pr.bio
    ORDER BY mutual_count DESC, pr.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- 7. PERFORMANCE INDEXES FOR PHASE 3
CREATE INDEX IF NOT EXISTS idx_posts_created_id ON public.posts(created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_posts_user_created ON public.posts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blocks_blocker_blocked ON public.blocks(blocker_id, blocked_id);
CREATE INDEX IF NOT EXISTS idx_profiles_trgm ON public.profiles USING gin (username gin_trgm_ops, display_name gin_trgm_ops);
