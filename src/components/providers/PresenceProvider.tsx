'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface PresenceContextType {
  onlineUserIds: Set<string>
  isUserOnline: (userId: string) => boolean
}

const PresenceContext = createContext<PresenceContextType>({
  onlineUserIds: new Set(),
  isUserOnline: () => false,
})

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set())
  const supabase = createClient()

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null

    async function initPresence() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      // Use a unique channel instance for this session to avoid callback collision
      const channelId = `presence-${user.id}`
      
      // Cleanup any existing channel with same name first
      const existingChannel = supabase.getChannels().find((ch: any) => ch.topic === `realtime:${channelId}` || ch.name === channelId)
      if (existingChannel) {
        await supabase.removeChannel(existingChannel)
      }

      channel = supabase.channel(channelId, {
        config: {
          presence: {
            key: user.id,
          },
        },
      })

      channel
        .on('presence', { event: 'sync' }, () => {
          if (!channel) return
          const state = channel.presenceState()
          const activeSet = new Set<string>()

          Object.keys(state).forEach((key) => {
            if (key) activeSet.add(key)
          })

          setOnlineUserIds(activeSet)
        })
        .on('presence', { event: 'join' }, ({ key }) => {
          if (key) {
            setOnlineUserIds((prev) => new Set(prev).add(key))
          }
        })
        .on('presence', { event: 'leave' }, ({ key }) => {
          if (key) {
            setOnlineUserIds((prev) => {
              const next = new Set(prev)
              next.delete(key)
              return next
            })
          }
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED' && channel) {
            await channel.track({
              online_at: new Date().toISOString(),
              user_id: user.id,
            })
          }
        })
    }

    initPresence()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [supabase])

  const isUserOnline = (userId: string) => onlineUserIds.has(userId)

  return (
    <PresenceContext.Provider value={{ onlineUserIds, isUserOnline }}>
      {children}
    </PresenceContext.Provider>
  )
}

export function usePresence() {
  return useContext(PresenceContext)
}
