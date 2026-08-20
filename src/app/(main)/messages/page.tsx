'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ConversationList } from '@/components/chat/ConversationList'
import { ChatWindow } from '@/components/chat/ChatWindow'
import { useToast } from '@/components/ui/Toast'
import { MessageSquare, Loader2 } from 'lucide-react'

function MessagesContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { showToast } = useToast()
  const supabase = createClient()

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [activePartner, setActivePartner] = useState<any | null>(null)
  const [isBlocked, setIsBlocked] = useState(false)
  const [loading, setLoading] = useState(true)

  const directUserParam = searchParams.get('user')
  const conversationParam = searchParams.get('c')

  useEffect(() => {
    async function initMessaging() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      setCurrentUserId(user.id)

      // Handle Direct User Request parameter (?user=userId)
      if (directUserParam) {
        try {
          const { data: convId, error } = await supabase.rpc('get_or_create_direct_conversation', {
            p_other_user_id: directUserParam,
          })

          if (error) {
            showToast(error.message, 'error')
          } else if (convId) {
            // Fetch partner profile
            const { data: partnerProfile } = await supabase
              .from('profiles')
              .select('id, username, display_name, avatar_url')
              .eq('id', directUserParam)
              .single()

            setActiveConversationId(convId)
            setActivePartner(partnerProfile)
            router.replace(`/messages?c=${convId}`)
          }
        } catch (err: any) {
          showToast(err.message || 'Could not start conversation', 'error')
        }
      } else if (conversationParam) {
        setActiveConversationId(conversationParam)
        
        // Query conversation partner reliably
        const { data: memberRows } = await supabase
          .from('conversation_members')
          .select('user_id')
          .eq('conversation_id', conversationParam)
          .neq('user_id', user.id)

        if (memberRows && memberRows.length > 0) {
          const partnerId = memberRows[0].user_id
          const { data: partnerProfile } = await supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url')
            .eq('id', partnerId)
            .single()

          if (partnerProfile) {
            setActivePartner(partnerProfile)
          }
        }
      }

      setLoading(false)
    }

    initMessaging()
  }, [supabase, directUserParam, conversationParam, router, showToast])

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-8rem)] max-w-6xl mx-auto flex gap-4">
      {/* Conversation List Sidebar */}
      <div
        className={`w-full md:w-80 h-full ${
          activeConversationId ? 'hidden md:block' : 'block'
        }`}
      >
        <ConversationList
          currentUserId={currentUserId!}
          activeConversationId={activeConversationId || undefined}
          onSelectConversation={(convId, partner, blocked) => {
            setActiveConversationId(convId)
            setActivePartner(partner)
            setIsBlocked(blocked)
          }}
        />
      </div>

      {/* Main Chat Workspace */}
      <div
        className={`flex-1 h-full min-w-0 ${
          !activeConversationId ? 'hidden md:flex' : 'flex'
        }`}
      >
        {activeConversationId && activePartner ? (
          <ChatWindow
            conversationId={activeConversationId}
            currentUserId={currentUserId!}
            partner={activePartner}
            isBlocked={isBlocked}
            onBackToConversations={() => setActiveConversationId(null)}
          />
        ) : (
          <div className="flex-1 h-full rounded-3xl glass-card border border-white/10 flex flex-col items-center justify-center p-8 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-sky-400 shadow-lg">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-white">Your Direct Messages</h2>
            <p className="text-xs text-slate-400 max-w-xs">
              Select an existing conversation from the list or message a creator from their profile page.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-sky-400 animate-spin" /></div>}>
      <MessagesContent />
    </Suspense>
  )
}
