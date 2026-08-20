'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useTypingIndicator(conversationId: string, currentUserId?: string) {
  const [isPartnerTyping, setIsPartnerTyping] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const supabase = createClient()

  const roomName = `typing-room-${conversationId}`

  useEffect(() => {
    if (!conversationId || !currentUserId) return

    // Clean up channel with same name if it was previously subscribed
    const existing = supabase.getChannels().find((ch: any) => ch.topic === `realtime:${roomName}` || ch.name === roomName)
    if (existing) {
      supabase.removeChannel(existing)
    }

    const channel = supabase.channel(roomName)

    channel
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.payload?.userId && payload.payload.userId !== currentUserId) {
          setIsPartnerTyping(true)
          if (timerRef.current) clearTimeout(timerRef.current)

          timerRef.current = setTimeout(() => {
            setIsPartnerTyping(false)
          }, 2500)
        }
      })
      .subscribe()

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      supabase.removeChannel(channel)
    }
  }, [conversationId, currentUserId, roomName, supabase])

  const sendTypingEvent = useCallback(() => {
    if (!conversationId || !currentUserId) return
    const channel = supabase.channel(roomName)
    channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: currentUserId },
    })
  }, [conversationId, currentUserId, roomName, supabase])

  return {
    isPartnerTyping,
    sendTypingEvent,
  }
}
