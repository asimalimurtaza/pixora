-- Migration 07: Phase 6 Notifications Architecture Fix & Account Privacy System

-- 1. ACCOUNT PRIVACY COLUMN
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE NOT NULL;

-- 2. FOLLOW REQUESTS TABLE & COLUMN ALIGNMENT
DO $$ 
BEGIN 
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'follow_requests' AND column_name = 'target_user_id'
  ) THEN
    ALTER TABLE public.follow_requests RENAME COLUMN target_user_id TO target_id;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.follow_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_follow_request UNIQUE(requester_id, target_id)
);

CREATE INDEX IF NOT EXISTS idx_follow_requests_target ON public.follow_requests(target_id, status);
CREATE INDEX IF NOT EXISTS idx_follow_requests_requester ON public.follow_requests(requester_id, status);

-- Enable RLS on follow_requests
ALTER TABLE public.follow_requests ENABLE ROW LEVEL SECURITY;

-- 3. EXPAND NOTIFICATIONS TYPE CONSTRAINT
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
    CHECK (type IN ('follow', 'follow_request', 'follow_accepted', 'like', 'comment', 'reply', 'mention', 'message'));

-- 4. SERVER-SIDE NOTIFICATION TRIGGERS (SELF-NOTIFICATION & DUPLICATE PREVENTION)

-- Follow Notification Trigger
CREATE OR REPLACE FUNCTION public.handle_new_follow_notification()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.follower_id <> NEW.following_id THEN
        INSERT INTO public.notifications (user_id, actor_id, type)
        SELECT NEW.following_id, NEW.follower_id, 'follow'
        WHERE NOT EXISTS (
            SELECT 1 FROM public.notifications 
            WHERE user_id = NEW.following_id AND actor_id = NEW.follower_id AND type = 'follow' AND created_at > NOW() - INTERVAL '1 minute'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Follow Request Notification Trigger
CREATE OR REPLACE FUNCTION public.handle_follow_request_notification()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.requester_id <> NEW.target_id AND NEW.status = 'pending' THEN
        INSERT INTO public.notifications (user_id, actor_id, type)
        VALUES (NEW.target_id, NEW.requester_id, 'follow_request');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_follow_request_notification
    AFTER INSERT ON public.follow_requests
    FOR EACH ROW EXECUTE FUNCTION public.handle_follow_request_notification();

-- Follow Accepted Notification Trigger
CREATE OR REPLACE FUNCTION public.handle_follow_accepted_notification()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
        INSERT INTO public.notifications (user_id, actor_id, type)
        VALUES (NEW.requester_id, NEW.target_id, 'follow_accepted');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_follow_accepted_notification
    AFTER UPDATE ON public.follow_requests
    FOR EACH ROW EXECUTE FUNCTION public.handle_follow_accepted_notification();

-- Message Notification Trigger
CREATE OR REPLACE FUNCTION public.handle_new_message_notification()
RETURNS TRIGGER AS $$
DECLARE
    recipient_id UUID;
BEGIN
    SELECT user_id INTO recipient_id 
    FROM public.conversation_members 
    WHERE conversation_id = NEW.conversation_id AND user_id <> NEW.sender_id 
    LIMIT 1;

    IF recipient_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, actor_id, type, conversation_id)
        VALUES (recipient_id, NEW.sender_id, 'message', NEW.conversation_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_message_notification
    AFTER INSERT ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_message_notification();

-- 5. PRIVACY & FOLLOW HELPER FUNCTIONS

-- Function to check if user is an approved follower of target
CREATE OR REPLACE FUNCTION public.is_approved_follower(p_target_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    target_is_private BOOLEAN;
BEGIN
    IF p_target_id = p_user_id THEN
        RETURN TRUE;
    END IF;

    SELECT is_private INTO target_is_private FROM public.profiles WHERE id = p_target_id;
    IF target_is_private IS FALSE OR target_is_private IS NULL THEN
        RETURN TRUE;
    END IF;

    RETURN EXISTS (
        SELECT 1 FROM public.follows
        WHERE follower_id = p_user_id AND following_id = p_target_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to send follow or create follow request based on privacy setting
CREATE OR REPLACE FUNCTION public.send_follow_request(p_target_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_is_private BOOLEAN;
    v_is_blocked BOOLEAN;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF v_user_id = p_target_id THEN
        RAISE EXCEPTION 'Cannot follow yourself';
    END IF;

    -- Check blocking
    SELECT EXISTS (
        SELECT 1 FROM public.blocks 
        WHERE (blocker_id = v_user_id AND blocked_id = p_target_id)
           OR (blocker_id = p_target_id AND blocked_id = v_user_id)
    ) INTO v_is_blocked;

    IF v_is_blocked THEN
        RAISE EXCEPTION 'Cannot follow blocked user';
    END IF;

    SELECT is_private INTO v_is_private FROM public.profiles WHERE id = p_target_id;

    IF v_is_private THEN
        -- Insert follow request
        INSERT INTO public.follow_requests (requester_id, target_id, status)
        VALUES (v_user_id, p_target_id, 'pending')
        ON CONFLICT (requester_id, target_id) DO UPDATE SET status = 'pending';

        RETURN jsonb_build_object('status', 'requested');
    ELSE
        -- Public account: direct follow
        INSERT INTO public.follows (follower_id, following_id)
        VALUES (v_user_id, p_target_id)
        ON CONFLICT (follower_id, following_id) DO NOTHING;

        RETURN jsonb_build_object('status', 'following');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to respond to follow request (Accept / Decline)
CREATE OR REPLACE FUNCTION public.respond_follow_request(p_request_id UUID, p_action TEXT)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_req RECORD;
BEGIN
    SELECT * INTO v_req FROM public.follow_requests WHERE id = p_request_id AND target_id = v_user_id;

    IF v_req IS NULL THEN
        RAISE EXCEPTION 'Follow request not found or unauthorized';
    END IF;

    IF p_action = 'accept' THEN
        -- Update request status
        UPDATE public.follow_requests SET status = 'accepted' WHERE id = p_request_id;

        -- Create active follow relationship
        INSERT INTO public.follows (follower_id, following_id)
        VALUES (v_req.requester_id, v_user_id)
        ON CONFLICT (follower_id, following_id) DO NOTHING;

        RETURN jsonb_build_object('status', 'accepted');
    ELSIF p_action = 'decline' THEN
        UPDATE public.follow_requests SET status = 'rejected' WHERE id = p_request_id;
        RETURN jsonb_build_object('status', 'rejected');
    ELSE
        RAISE EXCEPTION 'Invalid action. Must be accept or decline';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to remove an approved follower
CREATE OR REPLACE FUNCTION public.remove_follower(p_follower_id UUID)
RETURNS VOID AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    DELETE FROM public.follows WHERE follower_id = p_follower_id AND following_id = v_user_id;
    DELETE FROM public.follow_requests WHERE requester_id = p_follower_id AND target_id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. EFFICIENT HOME FEED RPC (N+1 QUERY FIX WITH PRIVACY)
CREATE OR REPLACE FUNCTION public.get_home_feed_v2(
    p_user_id UUID,
    p_limit INT DEFAULT 10,
    p_cursor TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_posts JSONB;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', p.id,
            'user_id', p.user_id,
            'caption', p.caption,
            'visibility', p.visibility,
            'created_at', p.created_at,
            'user', jsonb_build_object(
                'id', u.id,
                'username', u.username,
                'display_name', u.display_name,
                'avatar_url', u.avatar_url
            ),
            'media', (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', pm.id,
                        'media_url', pm.media_url,
                        'media_type', pm.media_type,
                        'position', pm.position
                    ) ORDER BY pm.position ASC
                )
                FROM public.post_media pm
                WHERE pm.post_id = p.id
            ),
            'likesCount', (SELECT COUNT(*) FROM public.likes l WHERE l.post_id = p.id),
            'commentsCount', (SELECT COUNT(*) FROM public.comments c WHERE c.post_id = p.id),
            'isLiked', EXISTS (SELECT 1 FROM public.likes l WHERE l.post_id = p.id AND l.user_id = p_user_id),
            'isSaved', EXISTS (SELECT 1 FROM public.saved_posts sp WHERE sp.post_id = p.id AND sp.user_id = p_user_id)
        )
    ) INTO v_posts
    FROM (
        SELECT p_inner.*
        FROM public.posts p_inner
        JOIN public.profiles prof ON prof.id = p_inner.user_id
        WHERE (
            -- Own posts OR followed users
            p_inner.user_id = p_user_id
            OR EXISTS (
                SELECT 1 FROM public.follows f
                WHERE f.follower_id = p_user_id AND f.following_id = p_inner.user_id
            )
        )
        -- Exclude blocked users
        AND NOT EXISTS (
            SELECT 1 FROM public.blocks b
            WHERE (b.blocker_id = p_user_id AND b.blocked_id = p_inner.user_id)
               OR (b.blocker_id = p_inner.user_id AND b.blocked_id = p_user_id)
        )
        -- Pagination cursor
        AND (p_cursor IS NULL OR p_inner.created_at < p_cursor)
        ORDER BY p_inner.created_at DESC
        LIMIT p_limit
    ) p
    JOIN public.profiles u ON u.id = p.user_id;

    RETURN COALESCE(v_posts, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 7. NOTIFICATIONS READ STATE HELPERS
CREATE OR REPLACE FUNCTION public.mark_notifications_read(p_notification_ids UUID[])
RETURNS VOID AS $$
BEGIN
    UPDATE public.notifications
    SET read = TRUE
    WHERE id = ANY(p_notification_ids) AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.notifications
    SET read = TRUE
    WHERE user_id = p_user_id AND read = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. RLS POLICIES FOR FOLLOW REQUESTS & PRIVACY

-- Follow Requests RLS
DROP POLICY IF EXISTS "Users can view their own follow requests" ON public.follow_requests;
DROP POLICY IF EXISTS "Users can create follow requests" ON public.follow_requests;
DROP POLICY IF EXISTS "Target users can update follow requests" ON public.follow_requests;
DROP POLICY IF EXISTS "Users can delete follow requests" ON public.follow_requests;

CREATE POLICY "Users can view their own follow requests"
ON public.follow_requests FOR SELECT TO authenticated
USING (auth.uid() = requester_id OR auth.uid() = target_id);

CREATE POLICY "Users can create follow requests"
ON public.follow_requests FOR INSERT TO authenticated
WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Target users can update follow requests"
ON public.follow_requests FOR UPDATE TO authenticated
USING (auth.uid() = target_id);

CREATE POLICY "Users can delete follow requests"
ON public.follow_requests FOR DELETE TO authenticated
USING (auth.uid() = requester_id OR auth.uid() = target_id);

-- Update Posts RLS for Private Account Content Protection
DROP POLICY IF EXISTS "Posts are viewable based on account privacy, visibility, and blocks" ON public.posts;
DROP POLICY IF EXISTS "Posts are viewable by authenticated users based on visibility and blocks" ON public.posts;

CREATE POLICY "Posts are viewable based on account privacy, visibility, and blocks"
ON public.posts FOR SELECT TO authenticated
USING (
    -- Author is self
    user_id = auth.uid()
    OR (
        -- Not blocked
        NOT EXISTS (
            SELECT 1 FROM public.blocks b
            WHERE (b.blocker_id = auth.uid() AND b.blocked_id = posts.user_id)
               OR (b.blocker_id = posts.user_id AND b.blocked_id = auth.uid())
        )
        AND (
            -- Account is public OR user is approved follower
            public.is_approved_follower(posts.user_id, auth.uid())
        )
    )
);

-- Update Stories RLS for Private Account Content Protection
DROP POLICY IF EXISTS "Stories viewable based on privacy and follow status" ON public.stories;
DROP POLICY IF EXISTS "Stories viewable by permitted users" ON public.stories;

CREATE POLICY "Stories viewable based on privacy and follow status"
ON public.stories FOR SELECT TO authenticated
USING (
    user_id = auth.uid()
    OR (
        expires_at > NOW()
        AND NOT EXISTS (
            SELECT 1 FROM public.blocks b
            WHERE (b.blocker_id = auth.uid() AND b.blocked_id = stories.user_id)
               OR (b.blocker_id = stories.user_id AND b.blocked_id = auth.uid())
        )
        AND public.is_approved_follower(stories.user_id, auth.uid())
    )
);
