'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface NotificationItem {
  id: string
  user_id: string
  actor_id: string
  type: 'follow' | 'follow_request' | 'follow_accepted' | 'like' | 'comment' | 'reply' | 'mention' | 'message'
  post_id: string | null
  comment_id: string | null
  conversation_id: string | null
  read: boolean
  created_at: string
  actor?: {
    id: string
    username: string
    display_name: string | null
    avatar_url: string | null
  }
}

export function useRealtimeNotifications(currentUserId?: string | null) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchNotifications = useCallback(async () => {
    if (!currentUserId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          actor:profiles!notifications_actor_id_fkey(id, username, display_name, avatar_url)
        `)
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false })
        .limit(30)

      if (!error && data) {
        setNotifications(data as any)
        setUnreadCount(data.filter((n) => !n.read).length)
      }
    } catch (err) {
      console.error('Error loading notifications:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase, currentUserId])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  useEffect(() => {
    if (!currentUserId) return

    // Unique channel topic per hook instance to prevent Realtime channel collisions
    const channelName = `notif-room-${currentUserId}-${Math.random().toString(36).substring(2, 7)}`

    // Remove any leftover channels with matching prefix if re-subscribing
    const existingChannels = supabase.getChannels().filter((ch: any) => ch.name?.startsWith(`notif-room-${currentUserId}`))
    existingChannels.forEach((ch: any) => supabase.removeChannel(ch))

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUserId}`,
        },
        async (payload) => {
          const newNotif = payload.new as NotificationItem
          // Fetch actor profile for incoming notification
          const { data: actorProfile } = await supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url')
            .eq('id', newNotif.actor_id)
            .single()

          const fullNotif: NotificationItem = {
            ...newNotif,
            actor: actorProfile || undefined,
          }

          setNotifications((prev) => [fullNotif, ...prev])
          setUnreadCount((prev) => prev + 1)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUserId}`,
        },
        (payload) => {
          const updated = payload.new as NotificationItem
          setNotifications((prev) =>
            prev.map((n) => (n.id === updated.id ? { ...n, read: updated.read } : n))
          )
          setNotifications((prev) => {
            setUnreadCount(prev.filter((n) => !n.read).length)
            return prev
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, currentUserId])

  const markAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))
    await supabase.rpc('mark_notifications_read', { p_notification_ids: [id] })
  }

  const markAllAsRead = async () => {
    if (!currentUserId) return
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
    await supabase.rpc('mark_all_notifications_read', { p_user_id: currentUserId })
  }

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAllRead: markAllAsRead,
    refetch: fetchNotifications,
  }
}
