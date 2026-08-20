'use client'

import { usePresence } from '@/components/providers/PresenceProvider'

export function useRealtimePresence(currentUserId?: string) {
  const { onlineUserIds, isUserOnline } = usePresence()

  return {
    onlineUserIds,
    isUserOnline,
  }
}
