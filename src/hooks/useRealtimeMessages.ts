'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Message } from '@/types/database'

export function useRealtimeMessages(conversationId: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [status, setStatus] = useState<'SUBSCRIBED' | 'CONNECTING' | 'DISCONNECTED'>('CONNECTING')
  const supabase = createClient()

  useEffect(() => {
    setMessages([])
  }, [conversationId])

  useEffect(() => {
    if (!conversationId) return

    setStatus('CONNECTING')
    const channelName = `messages-room-${conversationId}`

    // Cleanup existing channel instance if re-subscribing
    const existingChannel = supabase.getChannels().find((ch: any) => ch.topic === `realtime:${channelName}` || ch.name === channelName)
    if (existingChannel) {
      supabase.removeChannel(existingChannel)
    }

    const channel = supabase.channel(channelName)

    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new as Message
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev
              return [...prev, newMsg]
            })
          } else if (payload.eventType === 'UPDATE') {
            const updatedMsg = payload.new as Message
            setMessages((prev) =>
              prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m))
            )
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id
            setMessages((prev) => prev.filter((m) => m.id !== deletedId))
          }
        }
      )
      .subscribe((state) => {
        if (state === 'SUBSCRIBED') {
          setStatus('SUBSCRIBED')
        } else if (state === 'CLOSED' || state === 'CHANNEL_ERROR') {
          setStatus('DISCONNECTED')
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, supabase])

  const addMessageOptimistic = useCallback((msg: Message) => {
    setMessages((prev) => [...prev, msg])
  }, [])

  return {
    messages,
    setMessages,
    addMessageOptimistic,
    status,
  }
}
