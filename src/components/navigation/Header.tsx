'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications'
import { Sparkles, Heart, MessageSquare } from 'lucide-react'
import { GlobalSearch } from '@/components/search/GlobalSearch'
import { ThemeSwitcher } from '@/components/ui/ThemeSwitcher'

export function Header() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function getUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) setCurrentUserId(user.id)
    }
    getUser()
  }, [supabase])

  const { unreadCount } = useRealtimeNotifications(currentUserId)

  return (
    <header className="sticky top-0 z-30 w-full bg-slate-950/70 backdrop-blur-2xl border-b border-white/10 px-4 py-3 flex items-center justify-between gap-4">
      {/* Mobile Brand Logo */}
      <Link href="/" className="flex md:hidden items-center gap-2 shrink-0">
        <Sparkles className="w-5 h-5 text-pink-500" />
        <span className="text-lg font-black tracking-wider gradient-text uppercase">Pixora</span>
      </Link>

      {/* Global Search Bar with 300ms Debounce */}
      <GlobalSearch />

      {/* Header Controls */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden sm:block">
          <ThemeSwitcher />
        </div>

        <Link
          href="/notifications"
          className="relative p-2.5 rounded-full text-slate-300 hover:text-white hover:bg-slate-900 transition-all cursor-pointer"
          title="Notifications"
        >
          <Heart className="w-5 h-5 text-pink-400" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white text-[10px] font-extrabold shadow-md shadow-pink-500/30">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>
        <Link
          href="/messages"
          className="p-2.5 rounded-full text-slate-300 hover:text-white hover:bg-slate-900 transition-all md:hidden"
          title="Messages"
        >
          <MessageSquare className="w-5 h-5" />
        </Link>
      </div>
    </header>
  )
}
