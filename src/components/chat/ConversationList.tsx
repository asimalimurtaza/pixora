'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRealtimePresence } from '@/hooks/useRealtimePresence'
import { Search, MessageSquare, Loader2 } from 'lucide-react'

interface ConversationItem {
  conversation_id: string
  other_user: {
    id: string
    username: string
    display_name: string | null
    avatar_url: string | null
  }
  last_message: {
    id: string
    content: string | null
    attachment_url: string | null
    created_at: string
    deleted_at: string | null
  } | null
  unread_count: number
  is_blocked: boolean
  updated_at: string
}

interface ConversationListProps {
  currentUserId: string
  activeConversationId?: string
  onSelectConversation: (conversationId: string, partner: ConversationItem['other_user'], isBlocked: boolean) => void
}

export function ConversationList({
  currentUserId,
  activeConversationId,
  onSelectConversation,
}: ConversationListProps) {
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const supabase = createClient()
  const { isUserOnline } = useRealtimePresence(currentUserId)

  useEffect(() => {
    async function loadConversations() {
      setLoading(true)
      try {
        const { data } = await supabase.rpc('get_user_conversations', {
          p_user_id: currentUserId,
        })

        if (data) {
          setConversations(data as any)
        }
      } catch (err) {
        console.error('Error fetching conversations:', err)
      } finally {
        setLoading(false)
      }
    }

    loadConversations()
  }, [supabase, currentUserId])

  const filteredConversations = conversations.filter(
    (c) =>
      c.other_user?.username?.toLowerCase().includes(search.toLowerCase()) ||
      (c.other_user?.display_name && c.other_user.display_name.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="flex flex-col h-full bg-slate-900/60 rounded-3xl border border-white/10 p-4 space-y-4 shadow-xl">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          Messages
          <MessageSquare className="w-4 h-4 text-pink-400" />
        </h2>
      </div>

      {/* Filter Input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search DMs..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/50"
        />
      </div>

      {/* Conversations Stream */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-pink-500 animate-spin" />
          </div>
        ) : filteredConversations.length === 0 ? (
          <p className="text-center text-xs text-slate-500 py-8">
            No conversations found.
          </p>
        ) : (
          filteredConversations.map((item) => {
            const isActive = item.conversation_id === activeConversationId
            const isOnline = isUserOnline(item.other_user.id)
            const lastMsgText = item.last_message?.deleted_at
              ? 'Message deleted'
              : item.last_message?.content || (item.last_message?.attachment_url ? 'Image Attachment' : 'No messages yet')

            return (
              <div
                key={item.conversation_id}
                onClick={() => onSelectConversation(item.conversation_id, item.other_user, item.is_blocked)}
                className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all border ${
                  isActive
                    ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 border-pink-500/40 shadow-md'
                    : 'bg-slate-900/40 border-slate-800/60 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3 overflow-hidden flex-1">
                  <div className="relative shrink-0">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 p-0.5">
                      <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center font-bold text-xs text-white overflow-hidden">
                        {item.other_user.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.other_user.avatar_url} alt={item.other_user.username} className="w-full h-full object-cover" />
                        ) : (
                          item.other_user.display_name?.[0]?.toUpperCase() || item.other_user.username[0]?.toUpperCase()
                        )}
                      </div>
                    </div>
                    {/* Presence Dot */}
                    <span
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 ${
                        isOnline ? 'bg-emerald-500 shadow-md shadow-emerald-500/50' : 'bg-slate-500'
                      }`}
                    />
                  </div>

                  <div className="overflow-hidden min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-white truncate">
                        {item.other_user.display_name || item.other_user.username}
                      </p>
                      {item.last_message && (
                        <span className="text-[10px] text-slate-500 shrink-0">
                          {new Date(item.last_message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <p className={`text-[11px] truncate mt-0.5 ${item.unread_count > 0 ? 'font-bold text-pink-300' : 'text-slate-400'}`}>
                      {lastMsgText}
                    </p>
                  </div>
                </div>

                {/* Unread Badge */}
                {item.unread_count > 0 && (
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-pink-500 text-white font-black text-[10px] shrink-0 shadow-md">
                    {item.unread_count}
                  </span>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
