-- Pixora Phase 4 Migration: Realtime, Direct Messaging, Presence & Attachments

-- 1. SCHEMA UPDATES
ALTER TABLE public.conversation_members
ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ DEFAULT NOW() NOT NULL;

ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS attachment_path TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL;

-- Trigger for updated_at on messages
DROP TRIGGER IF EXISTS set_updated_at_messages ON public.messages;
CREATE TRIGGER set_updated_at_messages 
BEFORE UPDATE ON public.messages 
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 2. ENABLE SUPABASE REALTIME REPLICATION FOR MESSAGES & NOTIFICATIONS
BEGIN;
  -- Add messages & notifications to publication if not already present
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN OTHERS THEN
  -- Fallback if publication or tables are already configured
  NULL;
END;

-- 3. STORAGE BUCKET FOR MESSAGE ATTACHMENTS (PRIVATE BUCKET)
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-attachments', 'message-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies for message-attachments
CREATE POLICY "Conversation Members Read Attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'message-attachments'
    AND EXISTS (
        SELECT 1 FROM public.conversation_members cm
        WHERE cm.conversation_id::text = (storage.foldername(name))[1]
          AND cm.user_id = auth.uid()
    )
);

CREATE POLICY "Conversation Members Upload Attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'message-attachments'
    AND EXISTS (
        SELECT 1 FROM public.conversation_members cm
        WHERE cm.conversation_id::text = (storage.foldername(name))[1]
          AND cm.user_id = auth.uid()
    )
);

CREATE POLICY "Senders Delete Own Attachments"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'message-attachments'
    AND (storage.foldername(name))[2] = auth.uid()::text
);

-- 4. RPC: GET OR CREATE DIRECT CONVERSATION
CREATE OR REPLACE FUNCTION public.get_or_create_direct_conversation(p_other_user_id UUID)
RETURNS UUID AS $$
DECLARE
    v_current_user_id UUID;
    v_conversation_id UUID;
    v_is_blocked BOOLEAN;
BEGIN
    v_current_user_id := auth.uid();
    IF v_current_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF v_current_user_id = p_other_user_id THEN
        RAISE EXCEPTION 'Cannot start a conversation with yourself';
    END IF;

    -- Check if either user has blocked the other
    SELECT EXISTS (
        SELECT 1 FROM public.blocks
        WHERE (blocker_id = v_current_user_id AND blocked_id = p_other_user_id)
           OR (blocker_id = p_other_user_id AND blocked_id = v_current_user_id)
    ) INTO v_is_blocked;

    IF v_is_blocked THEN
        RAISE EXCEPTION 'Cannot start conversation with a blocked user';
    END IF;

    -- Find existing 2-way conversation
    SELECT cm1.conversation_id INTO v_conversation_id
    FROM public.conversation_members cm1
    JOIN public.conversation_members cm2 ON cm1.conversation_id = cm2.conversation_id
    WHERE cm1.user_id = v_current_user_id
      AND cm2.user_id = p_other_user_id
      AND (
          SELECT COUNT(*) FROM public.conversation_members cm_count 
          WHERE cm_count.conversation_id = cm1.conversation_id
      ) = 2
    LIMIT 1;

    IF v_conversation_id IS NOT NULL THEN
        RETURN v_conversation_id;
    END IF;

    -- Create new conversation if none exists
    INSERT INTO public.conversations DEFAULT VALUES
    RETURNING id INTO v_conversation_id;

    INSERT INTO public.conversation_members (conversation_id, user_id)
    VALUES 
        (v_conversation_id, v_current_user_id),
        (v_conversation_id, p_other_user_id);

    RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RPC: GET USER CONVERSATIONS LIST WITH UNREAD COUNTS
CREATE OR REPLACE FUNCTION public.get_user_conversations(p_user_id UUID)
RETURNS TABLE (
    conversation_id UUID,
    other_user JSON,
    last_message JSON,
    unread_count BIGINT,
    is_blocked BOOLEAN,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    WITH user_convs AS (
        SELECT cm.conversation_id, cm.last_read_at
        FROM public.conversation_members cm
        WHERE cm.user_id = p_user_id
    ),
    partner_info AS (
        SELECT 
            uc.conversation_id,
            uc.last_read_at,
            p.id AS partner_id,
            json_build_object(
                'id', p.id,
                'username', p.username,
                'display_name', p.display_name,
                'avatar_url', p.avatar_url
            ) AS partner_json
        FROM user_convs uc
        JOIN public.conversation_members cm2 ON cm2.conversation_id = uc.conversation_id AND cm2.user_id <> p_user_id
        JOIN public.profiles p ON p.id = cm2.user_id
    )
    SELECT 
        pi.conversation_id,
        pi.partner_json AS other_user,
        (
            SELECT json_build_object(
                'id', m.id,
                'sender_id', m.sender_id,
                'content', m.content,
                'attachment_url', m.attachment_url,
                'created_at', m.created_at,
                'deleted_at', m.deleted_at
            )
            FROM public.messages m
            WHERE m.conversation_id = pi.conversation_id
            ORDER BY m.created_at DESC
            LIMIT 1
        ) AS last_message,
        (
            SELECT COUNT(*)
            FROM public.messages m
            WHERE m.conversation_id = pi.conversation_id
              AND m.sender_id <> p_user_id
              AND m.created_at > pi.last_read_at
        ) AS unread_count,
        EXISTS (
            SELECT 1 FROM public.blocks b
            WHERE (b.blocker_id = p_user_id AND b.blocked_id = pi.partner_id)
               OR (b.blocker_id = pi.partner_id AND b.blocked_id = p_user_id)
        ) AS is_blocked,
        c.updated_at
    FROM partner_info pi
    JOIN public.conversations c ON c.id = pi.conversation_id
    ORDER BY c.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RPC: MARK CONVERSATION READ
CREATE OR REPLACE FUNCTION public.mark_conversation_read(p_conversation_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.conversation_members
    SET last_read_at = NOW()
    WHERE conversation_id = p_conversation_id
      AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RPC: GET TOTAL UNREAD MESSAGES COUNT
CREATE OR REPLACE FUNCTION public.get_total_unread_messages_count(p_user_id UUID)
RETURNS BIGINT AS $$
DECLARE
    v_count BIGINT;
BEGIN
    SELECT COUNT(m.id) INTO v_count
    FROM public.conversation_members cm
    JOIN public.messages m ON m.conversation_id = cm.conversation_id
    WHERE cm.user_id = p_user_id
      AND m.sender_id <> p_user_id
      AND m.created_at > cm.last_read_at;

    RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. INDEXES FOR REALTIME & MESSAGING
CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON public.messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_conv_members_user_conv ON public.conversation_members(user_id, conversation_id);
