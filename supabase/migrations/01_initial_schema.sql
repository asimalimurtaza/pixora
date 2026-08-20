-- Pixora Database Schema Migration
-- Includes PostgreSQL Extensions, Tables, Indexes, Triggers, RLS Policies, and Functions

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 2. TABLES

-- PROFILES (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT,
    bio TEXT,
    avatar_url TEXT,
    website TEXT,
    is_private BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT username_min_length CHECK (char_length(username) >= 3)
);

-- FOLLOWS
CREATE TABLE IF NOT EXISTS public.follows (
    follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    PRIMARY KEY (follower_id, following_id),
    CONSTRAINT no_self_follow CHECK (follower_id <> following_id)
);

-- POSTS
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    caption TEXT,
    visibility TEXT DEFAULT 'public' NOT NULL CHECK (visibility IN ('public', 'followers_only', 'private')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- POST MEDIA
CREATE TABLE IF NOT EXISTS public.post_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    media_type TEXT DEFAULT 'image' NOT NULL CHECK (media_type IN ('image', 'video')),
    position INT DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- LIKES
CREATE TABLE IF NOT EXISTS public.likes (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    PRIMARY KEY (user_id, post_id)
);

-- COMMENTS
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- STORIES
CREATE TABLE IF NOT EXISTS public.stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    media_type TEXT DEFAULT 'image' NOT NULL CHECK (media_type IN ('image', 'video')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours') NOT NULL
);

-- STORY VIEWS
CREATE TABLE IF NOT EXISTS public.story_views (
    story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    viewed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    PRIMARY KEY (story_id, user_id)
);

-- CONVERSATIONS
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- CONVERSATION MEMBERS
CREATE TABLE IF NOT EXISTS public.conversation_members (
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    PRIMARY KEY (conversation_id, user_id)
);

-- MESSAGES
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT,
    attachment_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    edited_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('follow', 'like', 'comment', 'reply', 'mention', 'message')),
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    read BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- REPORTS
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'reviewed', 'dismissed')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- BLOCKS
CREATE TABLE IF NOT EXISTS public.blocks (
    blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    PRIMARY KEY (blocker_id, blocked_id),
    CONSTRAINT no_self_block CHECK (blocker_id <> blocked_id)
);

-- SAVED POSTS
CREATE TABLE IF NOT EXISTS public.saved_posts (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    PRIMARY KEY (user_id, post_id)
);

-- POST EMBEDDINGS (pgvector for Semantic Search)
CREATE TABLE IF NOT EXISTS public.post_embeddings (
    post_id UUID PRIMARY KEY REFERENCES public.posts(id) ON DELETE CASCADE,
    embedding VECTOR(1536),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_media_post_id ON public.post_media(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON public.likes(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON public.comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON public.follows(following_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stories_user_expires ON public.stories(user_id, expires_at);

-- 4. FUNCTIONS & TRIGGERS

-- Function to handle updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to applicable tables
CREATE TRIGGER set_updated_at_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_posts BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_comments BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_conversations BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Automatic Profile Creation Trigger on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    clean_username TEXT;
    base_username TEXT;
    c INT := 0;
BEGIN
    base_username := LOWER(COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)));
    -- Sanitize username to alphanumeric + underscores
    base_username := regexp_replace(base_username, '[^a_z0-9_]', '', 'g');
    IF char_length(base_username) < 3 THEN
        base_username := 'user_' || substr(md5(random()::text), 1, 6);
    END IF;
    
    clean_username := base_username;
    -- Ensure unique username
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = clean_username) LOOP
        c := c + 1;
        clean_username := base_username || c;
    END LOOP;

    INSERT INTO public.profiles (
        id,
        username,
        display_name,
        avatar_url,
        bio
    )
    VALUES (
        NEW.id,
        clean_username,
        COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', clean_username),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
        ''
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger definition for new auth user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Automatic Notification Triggers
CREATE OR REPLACE FUNCTION public.handle_new_follow_notification()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.notifications (user_id, actor_id, type)
    VALUES (NEW.following_id, NEW.follower_id, 'follow');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_follow_notification
    AFTER INSERT ON public.follows
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_follow_notification();

CREATE OR REPLACE FUNCTION public.handle_new_like_notification()
RETURNS TRIGGER AS $$
DECLARE
    post_owner_id UUID;
BEGIN
    SELECT user_id INTO post_owner_id FROM public.posts WHERE id = NEW.post_id;
    IF post_owner_id IS NOT NULL AND post_owner_id <> NEW.user_id THEN
        INSERT INTO public.notifications (user_id, actor_id, type, post_id)
        VALUES (post_owner_id, NEW.user_id, 'like', NEW.post_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_like_notification
    AFTER INSERT ON public.likes
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_like_notification();

CREATE OR REPLACE FUNCTION public.handle_new_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
    post_owner_id UUID;
    parent_comment_owner_id UUID;
BEGIN
    SELECT user_id INTO post_owner_id FROM public.posts WHERE id = NEW.post_id;
    
    -- If reply to another comment
    IF NEW.parent_id IS NOT NULL THEN
        SELECT user_id INTO parent_comment_owner_id FROM public.comments WHERE id = NEW.parent_id;
        IF parent_comment_owner_id IS NOT NULL AND parent_comment_owner_id <> NEW.user_id THEN
            INSERT INTO public.notifications (user_id, actor_id, type, post_id, comment_id)
            VALUES (parent_comment_owner_id, NEW.user_id, 'reply', NEW.post_id, NEW.id);
        END IF;
    END IF;

    -- Notify post owner if comment isn't by owner
    IF post_owner_id IS NOT NULL AND post_owner_id <> NEW.user_id AND post_owner_id <> COALESCE(parent_comment_owner_id, '00000000-0000-0000-0000-000000000000'::uuid) THEN
        INSERT INTO public.notifications (user_id, actor_id, type, post_id, comment_id)
        VALUES (post_owner_id, NEW.user_id, 'comment', NEW.post_id, NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_comment_notification
    AFTER INSERT ON public.comments
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_comment_notification();

-- 5. ROW LEVEL SECURITY (RLS) POLICIES

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_embeddings ENABLE ROW LEVEL SECURITY;

-- PROFILES RLS
CREATE POLICY "Public profiles are viewable by authenticated users" 
ON public.profiles FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- FOLLOWS RLS
CREATE POLICY "Follows are viewable by authenticated users" 
ON public.follows FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create follow relationships" 
ON public.follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can delete follow relationships" 
ON public.follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);

-- POSTS RLS
CREATE POLICY "Posts viewable according to visibility" 
ON public.posts FOR SELECT TO authenticated, anon 
USING (
    user_id = auth.uid()
    OR visibility = 'public'
    OR (
        visibility = 'followers_only' 
        AND EXISTS (
            SELECT 1 FROM public.follows 
            WHERE follower_id = auth.uid() AND following_id = posts.user_id
        )
    )
);

CREATE POLICY "Users can insert their own posts" 
ON public.posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts" 
ON public.posts FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts" 
ON public.posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- POST MEDIA RLS
CREATE POLICY "Post media viewable by public" 
ON public.post_media FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "Users can insert media for their posts" 
ON public.post_media FOR INSERT TO authenticated 
WITH CHECK (
    EXISTS (SELECT 1 FROM public.posts WHERE id = post_id AND user_id = auth.uid())
);

CREATE POLICY "Users can delete media for their posts" 
ON public.post_media FOR DELETE TO authenticated 
USING (
    EXISTS (SELECT 1 FROM public.posts WHERE id = post_id AND user_id = auth.uid())
);

-- LIKES RLS
CREATE POLICY "Likes are viewable by authenticated users" 
ON public.likes FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "Users can create their own likes" 
ON public.likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own likes" 
ON public.likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- COMMENTS RLS
CREATE POLICY "Comments are viewable by authenticated users" 
ON public.comments FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "Users can insert comments as themselves" 
ON public.comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" 
ON public.comments FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" 
ON public.comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- STORIES RLS
CREATE POLICY "Active stories viewable by followers or owner" 
ON public.stories FOR SELECT TO authenticated 
USING (
    expires_at > NOW() 
    AND (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.follows 
            WHERE follower_id = auth.uid() AND following_id = stories.user_id
        )
    )
);

CREATE POLICY "Users can post stories" 
ON public.stories FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stories" 
ON public.stories FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- STORY VIEWS RLS
CREATE POLICY "Story owners can view view history" 
ON public.story_views FOR SELECT TO authenticated 
USING (
    user_id = auth.uid() 
    OR EXISTS (SELECT 1 FROM public.stories WHERE id = story_id AND user_id = auth.uid())
);

CREATE POLICY "Users can record story view" 
ON public.story_views FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- CONVERSATIONS & MESSAGES RLS
CREATE OR REPLACE FUNCTION public.is_conversation_member(p_conversation_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.conversation_members
        WHERE conversation_id = p_conversation_id AND user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE POLICY "Members can view conversations" 
ON public.conversations FOR SELECT TO authenticated 
USING (
    public.is_conversation_member(id, auth.uid())
);

CREATE POLICY "Members can view conversation members" 
ON public.conversation_members FOR SELECT TO authenticated 
USING (
    user_id = auth.uid()
    OR public.is_conversation_member(conversation_id, auth.uid())
);

CREATE POLICY "Members can insert conversation members" 
ON public.conversation_members FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Members can view messages" 
ON public.messages FOR SELECT TO authenticated 
USING (
    public.is_conversation_member(conversation_id, auth.uid())
);

CREATE POLICY "Members can send messages" 
ON public.messages FOR INSERT TO authenticated 
WITH CHECK (
    auth.uid() = sender_id 
    AND EXISTS (SELECT 1 FROM public.conversation_members WHERE conversation_id = messages.conversation_id AND user_id = auth.uid())
);

-- NOTIFICATIONS RLS
CREATE POLICY "Users can view their own notifications" 
ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- SAVED POSTS RLS
CREATE POLICY "Users can view their saved posts" 
ON public.saved_posts FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can save posts" 
ON public.saved_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave posts" 
ON public.saved_posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- REPORTS RLS
CREATE POLICY "Users can insert reports" 
ON public.reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view their own reports" 
ON public.reports FOR SELECT TO authenticated USING (auth.uid() = reporter_id);

-- BLOCKS RLS
CREATE POLICY "Users can view their blocks" 
ON public.blocks FOR SELECT TO authenticated USING (auth.uid() = blocker_id);

CREATE POLICY "Users can add blocks" 
ON public.blocks FOR INSERT TO authenticated WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can remove blocks" 
ON public.blocks FOR DELETE TO authenticated USING (auth.uid() = blocker_id);

-- STORAGE BUCKETS SETUP INSTRUCTIONS (Run in Supabase dashboard or via API):
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('post-media', 'post-media', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('story-media', 'story-media', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('message-attachments', 'message-attachments', false);
