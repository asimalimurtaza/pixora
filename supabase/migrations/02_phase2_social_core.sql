-- Pixora Phase 2: Social Core Migration
-- Includes follow_requests table, storage policies, enhanced private post RLS, and functions

-- 1. FOLLOW REQUESTS TABLE (For Private Accounts)
CREATE TABLE IF NOT EXISTS public.follow_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_follow_request UNIQUE (requester_id, target_user_id),
    CONSTRAINT no_self_follow_request CHECK (requester_id <> target_user_id)
);

-- Indexes for Follow Requests
CREATE INDEX IF NOT EXISTS idx_follow_requests_target ON public.follow_requests(target_user_id, status);
CREATE INDEX IF NOT EXISTS idx_follow_requests_requester ON public.follow_requests(requester_id);

-- 2. TRIGGER: AUTO-CREATE FOLLOW UPON REQUEST ACCEPTANCE
CREATE OR REPLACE FUNCTION public.handle_follow_request_acceptance()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status <> 'accepted') THEN
        INSERT INTO public.follows (follower_id, following_id)
        VALUES (NEW.requester_id, NEW.target_user_id)
        ON CONFLICT (follower_id, following_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_follow_request_accepted ON public.follow_requests;
CREATE TRIGGER on_follow_request_accepted
    AFTER UPDATE ON public.follow_requests
    FOR EACH ROW EXECUTE FUNCTION public.handle_follow_request_acceptance();

-- 3. FOLLOW STATUS HELPER FUNCTION
CREATE OR REPLACE FUNCTION public.get_follow_status(p_viewer_id UUID, p_target_id UUID)
RETURNS TEXT AS $$
DECLARE
    is_following BOOLEAN;
    is_requested BOOLEAN;
BEGIN
    IF p_viewer_id = p_target_id THEN
        RETURN 'self';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.follows WHERE follower_id = p_viewer_id AND following_id = p_target_id
    ) INTO is_following;

    IF is_following THEN
        RETURN 'following';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.follow_requests WHERE requester_id = p_viewer_id AND target_user_id = p_target_id AND status = 'pending'
    ) INTO is_requested;

    IF is_requested THEN
        RETURN 'requested';
    END IF;

    RETURN 'none';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RLS POLICIES FOR FOLLOW REQUESTS
ALTER TABLE public.follow_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view relevant follow requests"
ON public.follow_requests FOR SELECT TO authenticated
USING (auth.uid() = requester_id OR auth.uid() = target_user_id);

CREATE POLICY "Requesters can create follow requests"
ON public.follow_requests FOR INSERT TO authenticated
WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Target users can update request status"
ON public.follow_requests FOR UPDATE TO authenticated
USING (auth.uid() = target_user_id);

CREATE POLICY "Users can delete follow requests"
ON public.follow_requests FOR DELETE TO authenticated
USING (auth.uid() = requester_id OR auth.uid() = target_user_id);

-- 5. REFINED RLS FOR PRIVATE POST VISIBILITY
DROP POLICY IF EXISTS "Posts viewable according to visibility" ON public.posts;

CREATE POLICY "Posts viewable according to visibility and account privacy"
ON public.posts FOR SELECT TO authenticated, anon
USING (
    -- User owns the post
    user_id = auth.uid()
    OR
    -- Post author is public and post visibility is public
    (
        visibility = 'public' 
        AND EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = posts.user_id AND is_private = FALSE
        )
    )
    OR
    -- Viewer is an accepted follower of the post author
    EXISTS (
        SELECT 1 FROM public.follows 
        WHERE follower_id = auth.uid() AND following_id = posts.user_id
    )
);

-- 6. STORAGE BUCKET CREATION & POLICIES (Run in Supabase Dashboard or SQL Editor)
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-media', 'post-media', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for post-media bucket
CREATE POLICY "Public Read Access for Post Media"
ON storage.objects FOR SELECT TO authenticated, anon
USING (bucket_id = 'post-media');

CREATE POLICY "Authenticated Users Upload Post Media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'post-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users Delete Own Post Media"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'post-media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Storage Policies for avatars bucket
CREATE POLICY "Public Read Access for Avatars"
ON storage.objects FOR SELECT TO authenticated, anon
USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated Users Upload Avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users Delete Own Avatar"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
