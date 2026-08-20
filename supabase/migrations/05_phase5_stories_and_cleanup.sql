-- Pixora Phase 5 Migration: Stories, Viewers, Privacy & Cleanup

-- 1. SCHEMA UPDATES FOR STORIES & STORY VIEWS
ALTER TABLE public.stories
ADD COLUMN IF NOT EXISTS media_path TEXT,
ADD COLUMN IF NOT EXISTS caption TEXT;

ALTER TABLE public.stories
ALTER COLUMN expires_at SET DEFAULT (NOW() + INTERVAL '24 hours');

-- Ensure Unique View Constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_story_view'
    ) THEN
        ALTER TABLE public.story_views
        ADD CONSTRAINT unique_story_view UNIQUE(story_id, user_id);
    END IF;
END $$;

-- 2. STORAGE BUCKET FOR STORIES
INSERT INTO storage.buckets (id, name, public)
VALUES ('story-media', 'story-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
CREATE POLICY "Public Read Active Story Media"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'story-media');

CREATE POLICY "Users Upload Own Story Media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'story-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users Delete Own Story Media"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'story-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. RLS POLICIES FOR STORIES & STORY VIEWS
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

-- Drop previous policies if existing
DROP POLICY IF EXISTS "Active stories viewable by authorized users" ON public.stories;
DROP POLICY IF EXISTS "Users can insert own stories" ON public.stories;
DROP POLICY IF EXISTS "Users can delete own stories" ON public.stories;
DROP POLICY IF EXISTS "Owner viewable story views" ON public.story_views;
DROP POLICY IF EXISTS "Viewers insert story view" ON public.story_views;

CREATE POLICY "Active stories viewable by authorized users"
ON public.stories FOR SELECT TO authenticated
USING (
    expires_at > NOW()
    AND (
        user_id = auth.uid()
        OR user_id IN (SELECT id FROM public.profiles WHERE is_private = false)
        OR user_id IN (SELECT following_id FROM public.follows WHERE follower_id = auth.uid())
    )
    AND NOT EXISTS (
        SELECT 1 FROM public.blocks
        WHERE (blocker_id = auth.uid() AND blocked_id = user_id)
           OR (blocker_id = user_id AND blocked_id = auth.uid())
    )
);

CREATE POLICY "Users can insert own stories"
ON public.stories FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own stories"
ON public.stories FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Story Views RLS Policies (Owner ONLY reading!)
CREATE POLICY "Owner viewable story views"
ON public.story_views FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.stories s
        WHERE s.id = story_id AND s.user_id = auth.uid()
    )
);

CREATE POLICY "Viewers insert story view"
ON public.story_views FOR INSERT TO authenticated
WITH CHECK (
    auth.uid() <> (SELECT user_id FROM public.stories WHERE id = story_id)
);

-- 4. RPC: GET FEED ACTIVE STORIES
CREATE OR REPLACE FUNCTION public.get_feed_active_stories(p_viewer_id UUID)
RETURNS TABLE (
    user_id UUID,
    username TEXT,
    display_name TEXT,
    avatar_url TEXT,
    total_stories BIGINT,
    has_unseen BOOLEAN,
    latest_created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    WITH permitted_creators AS (
        SELECT p.id, p.username, p.display_name, p.avatar_url
        FROM public.profiles p
        WHERE p.id = p_viewer_id
           OR p.is_private = false
           OR EXISTS (
               SELECT 1 FROM public.follows f
               WHERE f.follower_id = p_viewer_id AND f.following_id = p.id
           )
    ),
    active_user_stories AS (
        SELECT 
            s.user_id,
            COUNT(s.id) AS story_count,
            MAX(s.created_at) AS max_created,
            EXISTS (
                SELECT 1 FROM public.stories s_unseen
                WHERE s_unseen.user_id = s.user_id
                  AND s_unseen.expires_at > NOW()
                  AND NOT EXISTS (
                      SELECT 1 FROM public.story_views sv
                      WHERE sv.story_id = s_unseen.id AND sv.user_id = p_viewer_id
                  )
            ) AS unseen_flag
        FROM public.stories s
        JOIN permitted_creators pc ON pc.id = s.user_id
        WHERE s.expires_at > NOW()
          AND NOT EXISTS (
              SELECT 1 FROM public.blocks b
              WHERE (b.blocker_id = p_viewer_id AND b.blocked_id = s.user_id)
                 OR (b.blocker_id = s.user_id AND b.blocked_id = p_viewer_id)
          )
        GROUP BY s.user_id
    )
    SELECT 
        pc.id AS user_id,
        pc.username::TEXT,
        pc.display_name::TEXT,
        pc.avatar_url::TEXT,
        aus.story_count AS total_stories,
        aus.unseen_flag AS has_unseen,
        aus.max_created AS latest_created_at
    FROM active_user_stories aus
    JOIN permitted_creators pc ON pc.id = aus.user_id
    ORDER BY 
        CASE WHEN pc.id = p_viewer_id THEN 0 ELSE 1 END,
        aus.unseen_flag DESC,
        aus.max_created DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RPC: GET USER ACTIVE STORIES
CREATE OR REPLACE FUNCTION public.get_user_active_stories(p_viewer_id UUID, p_target_user_id UUID)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    media_url TEXT,
    media_path TEXT,
    media_type TEXT,
    caption TEXT,
    created_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    has_viewed BOOLEAN,
    viewer_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.user_id,
        s.media_url,
        s.media_path,
        s.media_type::TEXT,
        s.caption,
        s.created_at,
        s.expires_at,
        EXISTS (
            SELECT 1 FROM public.story_views sv
            WHERE sv.story_id = s.id AND sv.user_id = p_viewer_id
        ) AS has_viewed,
        (
            SELECT COUNT(*) FROM public.story_views sv_cnt
            WHERE sv_cnt.story_id = s.id
        ) AS viewer_count
    FROM public.stories s
    WHERE s.user_id = p_target_user_id
      AND s.expires_at > NOW()
    ORDER BY s.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RPC: RECORD STORY VIEW
CREATE OR REPLACE FUNCTION public.record_story_view(p_story_id UUID)
RETURNS VOID AS $$
DECLARE
    v_story_owner UUID;
BEGIN
    SELECT user_id INTO v_story_owner
    FROM public.stories
    WHERE id = p_story_id;

    -- Owner views don't count towards public viewer list
    IF v_story_owner IS NULL OR v_story_owner = auth.uid() THEN
        RETURN;
    END IF;

    INSERT INTO public.story_views (story_id, user_id)
    VALUES (p_story_id, auth.uid())
    ON CONFLICT (story_id, user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RPC: GET STORY VIEWERS (OWNER ONLY)
CREATE OR REPLACE FUNCTION public.get_story_viewers(p_story_id UUID)
RETURNS TABLE (
    id UUID,
    username TEXT,
    display_name TEXT,
    avatar_url TEXT,
    viewed_at TIMESTAMPTZ
) AS $$
BEGIN
    -- Verify story owner
    IF NOT EXISTS (
        SELECT 1 FROM public.stories
        WHERE id = p_story_id AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Unauthorized to view story audience list';
    END IF;

    RETURN QUERY
    SELECT 
        p.id,
        p.username::TEXT,
        p.display_name::TEXT,
        p.avatar_url::TEXT,
        sv.viewed_at
    FROM public.story_views sv
    JOIN public.profiles p ON p.id = sv.user_id
    WHERE sv.story_id = p_story_id
    ORDER BY sv.viewed_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. INDEXES FOR HIGH-PERFORMANCE STORIES
CREATE INDEX IF NOT EXISTS idx_stories_user_expires ON public.stories(user_id, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_stories_expires ON public.stories(expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_story_views_story_user ON public.story_views(story_id, user_id);
