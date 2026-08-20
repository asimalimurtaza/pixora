'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRealtimeNotifications, NotificationItem } from '@/hooks/useRealtimeNotifications'
import { Heart, Bell, CheckCheck, Loader2, UserPlus, MessageSquare, Sparkles, ShieldAlert } from 'lucide-react'

export default function NotificationsPage() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function getUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) setCurrentUserId(user.id)
    }
    getUser()
  }, [supabase])

  const { notifications, unreadCount, loading, markAsRead, markAllAllRead } =
    useRealtimeNotifications(currentUserId)

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.read) {
      await markAsRead(notif.id)
    }

    if (notif.type === 'follow' || notif.type === 'follow_accepted') {
      if (notif.actor) router.push(`/profile/${notif.actor.username}`)
    } else if (notif.type === 'follow_request') {
      router.push('/settings/privacy')
    } else if (notif.type === 'like' || notif.type === 'comment' || notif.type === 'reply') {
      if (notif.post_id) router.push(`/post/${notif.post_id}`)
    } else if (notif.type === 'message') {
      if (notif.conversation_id) router.push(`/messages?c=${notif.conversation_id}`)
    }
  }

  const renderDescription = (notif: NotificationItem) => {
    const actorName = notif.actor?.display_name || notif.actor?.username || 'Someone'
    switch (notif.type) {
      case 'follow':
        return <span><strong className="text-white">{actorName}</strong> started following you.</span>
      case 'follow_request':
        return <span><strong className="text-white">{actorName}</strong> requested to follow you.</span>
      case 'follow_accepted':
        return <span><strong className="text-white">{actorName}</strong> accepted your follow request.</span>
      case 'like':
        return <span><strong className="text-white">{actorName}</strong> liked your post.</span>
      case 'comment':
        return <span><strong className="text-white">{actorName}</strong> commented on your post.</span>
      case 'reply':
        return <span><strong className="text-white">{actorName}</strong> replied to your comment.</span>
      case 'message':
        return <span><strong className="text-white">{actorName}</strong> sent you a direct message.</span>
      default:
        return <span><strong className="text-white">{actorName}</strong> interacted with your account.</span>
    }
  }

  const renderIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="w-4 h-4 text-rose-400 fill-rose-400/20" />
      case 'comment':
      case 'reply':
        return <MessageSquare className="w-4 h-4 text-sky-400" />
      case 'follow':
      case 'follow_accepted':
        return <UserPlus className="w-4 h-4 text-indigo-400" />
      case 'follow_request':
        return <ShieldAlert className="w-4 h-4 text-amber-400" />
      case 'message':
        return <MessageSquare className="w-4 h-4 text-emerald-400" />
      default:
        return <Sparkles className="w-4 h-4 text-sky-400" />
    }
  }

  // Group notifications into TODAY and EARLIER
  const today = new Date().toDateString()
  const todayNotifs = notifications.filter((n) => new Date(n.created_at).toDateString() === today)
  const earlierNotifs = notifications.filter((n) => new Date(n.created_at).toDateString() !== today)

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl border border-indigo-500/40 bg-indigo-500/10 flex items-center justify-center text-sky-400 shadow-xs">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              Notifications
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-sky-500 text-white text-[11px] font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </h1>
            <p className="text-[11px] text-slate-400">Activity and interactions across your stream.</p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllAllRead}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-500/40 bg-indigo-500/10 hover:bg-indigo-500/20 text-sky-300 text-xs font-semibold transition-all cursor-pointer"
          >
            <CheckCheck className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center space-y-3 border border-white/10">
          <Bell className="w-10 h-10 text-slate-500 mx-auto" />
          <h2 className="text-lg font-bold text-white">No Activity Yet</h2>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            When creators like, comment, or follow your account, real-time alerts will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Today's Activity */}
          {todayNotifs.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">Today</h2>
              <div className="space-y-2">
                {todayNotifs.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${
                      !n.read
                        ? 'bg-indigo-500/10 border-indigo-500/40 shadow-sm'
                        : 'glass-card border-white/5 hover:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 overflow-hidden">
                      <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-sky-500 p-0.5">
                          <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center font-bold text-xs text-white overflow-hidden">
                            {n.actor?.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={n.actor.avatar_url} alt={n.actor.username} className="w-full h-full object-cover" />
                            ) : (
                              n.actor?.username[0]?.toUpperCase() || 'U'
                            )}
                          </div>
                        </div>
                        <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-slate-900 border border-slate-800 shadow-md">
                          {renderIcon(n.type)}
                        </div>
                      </div>

                      <div className="text-xs text-slate-300 overflow-hidden">
                        <p>{renderDescription(n)}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {new Date(n.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>

                    {!n.read && (
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shrink-0 shadow-md shadow-sky-400/50" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Earlier Activity */}
          {earlierNotifs.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">Earlier</h2>
              <div className="space-y-2">
                {earlierNotifs.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${
                      !n.read
                        ? 'bg-indigo-500/10 border-indigo-500/40 shadow-sm'
                        : 'glass-card border-white/5 hover:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 overflow-hidden">
                      <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-sky-500 p-0.5">
                          <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center font-bold text-xs text-white overflow-hidden">
                            {n.actor?.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={n.actor.avatar_url} alt={n.actor.username} className="w-full h-full object-cover" />
                            ) : (
                              n.actor?.username[0]?.toUpperCase() || 'U'
                            )}
                          </div>
                        </div>
                        <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-slate-900 border border-slate-800 shadow-md">
                          {renderIcon(n.type)}
                        </div>
                      </div>

                      <div className="text-xs text-slate-300 overflow-hidden">
                        <p>{renderDescription(n)}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {new Date(n.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </div>

                    {!n.read && (
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shrink-0 shadow-md shadow-sky-400/50" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
