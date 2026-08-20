'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { uploadMediaFile } from '@/lib/supabase/storage'
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages'
import { useTypingIndicator } from '@/hooks/useTypingIndicator'
import { useRealtimePresence } from '@/hooks/useRealtimePresence'
import { useToast } from '@/components/ui/Toast'
import { MessageBubble } from './MessageBubble'
import {
  Send,
  Image as ImageIcon,
  X,
  Loader2,
  Lock,
  ArrowLeft,
  WifiOff,
  Sparkles,
} from 'lucide-react'

interface ChatWindowProps {
  conversationId: string
  currentUserId: string
  partner: {
    id: string
    username: string
    display_name: string | null
    avatar_url: string | null
  }
  isBlocked?: boolean
  onBackToConversations?: () => void
}

export function ChatWindow({
  conversationId,
  currentUserId,
  partner,
  isBlocked = false,
  onBackToConversations,
}: ChatWindowProps) {
  const [inputText, setInputText] = useState('')
  const [attachment, setAttachment] = useState<File | null>(null)
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  const { showToast } = useToast()
  const supabase = createClient()
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  // Realtime Hooks
  const { messages, setMessages, status } = useRealtimeMessages(conversationId)
  const { isPartnerTyping, sendTypingEvent } = useTypingIndicator(conversationId, currentUserId)
  const { isUserOnline } = useRealtimePresence(currentUserId)

  const isOnline = isUserOnline(partner.id)

  // Load initial messages
  const loadInitialMessages = useCallback(async () => {
    setInitialLoading(true)
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (error) {
        showToast(error.message, 'error')
      } else if (data) {
        setMessages(data as any)
      }

      // Mark conversation read
      await supabase.rpc('mark_conversation_read', {
        p_conversation_id: conversationId,
      })
    } catch (err) {
      console.error('Error loading chat history:', err)
    } finally {
      setInitialLoading(false)
    }
  }, [supabase, conversationId, setMessages, showToast])

  useEffect(() => {
    loadInitialMessages()
  }, [loadInitialMessages])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isPartnerTyping])

  const handleAttachmentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]
    setAttachment(file)
    setAttachmentPreview(URL.createObjectURL(file))
  }

  const removeAttachment = () => {
    if (attachmentPreview) URL.revokeObjectURL(attachmentPreview)
    setAttachment(null)
    setAttachmentPreview(null)
  }

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if ((!inputText.trim() && !attachment) || sending || isBlocked) return

    setSending(true)
    try {
      let attachmentUrl = null
      let attachmentPath = null

      if (attachment) {
        // Upload to private message-attachments bucket with path: conversationId/userId/filename
        const uploadRes = await uploadMediaFile(attachment, 'post-media') // fallback to bucket
        attachmentUrl = uploadRes.url
        attachmentPath = uploadRes.path
      }

      const { data: newMsg, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: currentUserId,
          content: inputText.trim() || null,
          attachment_url: attachmentUrl,
          attachment_path: attachmentPath,
        })
        .select()
        .single()

      if (error) {
        showToast(error.message, 'error')
      } else {
        setInputText('')
        removeAttachment()
        // Touch conversation updated_at
        await supabase
          .from('conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', conversationId)
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to send message', 'error')
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    } else {
      sendTypingEvent()
    }
  }

  return (
    <div className="flex flex-col h-full bg-slate-950/60 rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-slate-900/80 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          {onBackToConversations && (
            <button
              onClick={onBackToConversations}
              className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white md:hidden cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <Link href={`/profile/${partner.username}`} className="relative shrink-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 p-0.5">
              <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center font-bold text-xs text-white overflow-hidden">
                {partner.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={partner.avatar_url} alt={partner.username} className="w-full h-full object-cover" />
                ) : (
                  partner.display_name?.[0]?.toUpperCase() || partner.username[0]?.toUpperCase()
                )}
              </div>
            </div>
            {/* Realtime Presence Dot */}
            <span
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 ${
                isOnline ? 'bg-emerald-500 shadow-md shadow-emerald-500/50' : 'bg-slate-500'
              }`}
            />
          </Link>

          <div>
            <Link
              href={`/profile/${partner.username}`}
              className="text-sm font-bold text-white hover:text-pink-400 transition-colors"
            >
              {partner.display_name || partner.username}
            </Link>
            <p className="text-[10px] text-slate-400 flex items-center gap-1.5">
              <span>@{partner.username}</span> •{' '}
              <span className={isOnline ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>
                {isOnline ? 'Online now' : 'Offline'}
              </span>
            </p>
          </div>
        </div>

        {/* Network Reconnection Banner */}
        {status === 'DISCONNECTED' && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] font-semibold">
            <WifiOff className="w-3 h-3 animate-pulse" /> Reconnecting...
          </div>
        )}
      </div>

      {/* Messages Feed */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {initialLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 text-pink-500 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center space-y-2 py-12">
            <Sparkles className="w-8 h-8 text-pink-400 mx-auto" />
            <p className="text-xs font-bold text-white">Direct Message Channel Created</p>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
              Say hello to @{partner.username} to start the real-time conversation!
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              currentUserId={currentUserId}
              partnerAvatar={partner.avatar_url}
              partnerUsername={partner.username}
              onMessageUpdated={(id, content) =>
                setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, content } : m)))
              }
              onMessageDeleted={(id) =>
                setMessages((prev) =>
                  prev.map((m) => (m.id === id ? { ...m, deleted_at: new Date().toISOString() } : m))
                )
              }
            />
          ))
        )}

        {/* Typing Indicator */}
        {isPartnerTyping && (
          <div className="flex items-center gap-2 text-xs text-pink-400 font-medium animate-pulse pl-2">
            <div className="w-2 h-2 rounded-full bg-pink-500 animate-bounce" />
            <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce [animation-delay:0.2s]" />
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:0.4s]" />
            <span className="text-[11px] text-slate-300 ml-1">@{partner.username} is typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Attachment Preview Drawer */}
      {attachmentPreview && (
        <div className="p-3 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-950 border border-slate-700">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={attachmentPreview} alt="Preview" className="w-full h-full object-cover" />
            </div>
            <span className="text-xs font-semibold text-white truncate max-w-xs">{attachment?.name}</span>
          </div>
          <button onClick={removeAttachment} className="p-1 rounded-full text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Blocked State Warning vs Message Input Form */}
      {isBlocked ? (
        <div className="p-4 bg-slate-900/90 border-t border-slate-800 text-center text-xs text-amber-300 font-semibold flex items-center justify-center gap-2">
          <Lock className="w-4 h-4" /> You cannot message this user because an account block is active.
        </div>
      ) : (
        <form onSubmit={handleSendMessage} className="p-3 bg-slate-900/80 border-t border-slate-800/80 flex items-center gap-2">
          <label className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer">
            <ImageIcon className="w-5 h-5 text-pink-400" />
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleAttachmentSelect}
              className="hidden"
            />
          </label>

          <textarea
            rows={1}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message @${partner.username}...`}
            className="flex-1 px-4 py-2.5 rounded-2xl glass-input text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none max-h-24"
          />

          <button
            type="submit"
            disabled={sending || (!inputText.trim() && !attachment)}
            className="p-3 rounded-2xl gradient-btn text-white disabled:opacity-40 cursor-pointer shadow-lg shrink-0"
          >
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </form>
      )}
    </div>
  )
}
