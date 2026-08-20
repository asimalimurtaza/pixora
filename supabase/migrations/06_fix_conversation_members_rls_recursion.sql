-- Pixora Fix Migration: Resolve Infinite Recursion in conversation_members RLS Policy

-- 1. SECURITY DEFINER HELPER FOR CONVERSATION MEMBERSHIP
CREATE OR REPLACE FUNCTION public.is_conversation_member(p_conversation_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.conversation_members
        WHERE conversation_id = p_conversation_id AND user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. REFRESH RLS POLICIES TO PREVENT RECURSIVE SUBQUERIES

-- conversation_members
DROP POLICY IF EXISTS "Members can view conversation members" ON public.conversation_members;
CREATE POLICY "Members can view conversation members" 
ON public.conversation_members FOR SELECT TO authenticated 
USING (
    user_id = auth.uid()
    OR public.is_conversation_member(conversation_id, auth.uid())
);

-- conversations
DROP POLICY IF EXISTS "Members can view conversations" ON public.conversations;
CREATE POLICY "Members can view conversations" 
ON public.conversations FOR SELECT TO authenticated 
USING (
    public.is_conversation_member(id, auth.uid())
);

-- messages
DROP POLICY IF EXISTS "Members can view messages" ON public.messages;
CREATE POLICY "Members can view messages" 
ON public.messages FOR SELECT TO authenticated 
USING (
    public.is_conversation_member(conversation_id, auth.uid())
);

-- Storage bucket policies using SECURITY DEFINER helper
DROP POLICY IF EXISTS "Conversation Members Read Attachments" ON storage.objects;
CREATE POLICY "Conversation Members Read Attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'message-attachments'
    AND public.is_conversation_member(((storage.foldername(name))[1])::uuid, auth.uid())
);

DROP POLICY IF EXISTS "Conversation Members Upload Attachments" ON storage.objects;
CREATE POLICY "Conversation Members Upload Attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'message-attachments'
    AND public.is_conversation_member(((storage.foldername(name))[1])::uuid, auth.uid())
);
