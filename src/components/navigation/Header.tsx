'use client'

import React from 'react'
import Link from 'next/link'
import { Sparkles, Heart, MessageSquare } from 'lucide-react'
import { GlobalSearch } from '@/components/search/GlobalSearch'

export function Header() {
  return (
    <header className="sticky top-0 z-30 w-full bg-slate-900/60 backdrop-blur-xl border-b border-slate-800/60 px-4 py-3 flex items-center justify-between gap-4">
      {/* Mobile Logo / Brand */}
      <Link href="/" className="flex md:hidden items-center gap-2 shrink-0">
        <Sparkles className="w-5 h-5 text-pink-500" />
        <span className="text-xl font-black tracking-wider gradient-text uppercase">Pixora</span>
      </Link>

      {/* Global Search Bar with 300ms Debounce */}
      <GlobalSearch />

      {/* Header Quick Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <Link
          href="/notifications"
          className="relative p-2 rounded-full text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all"
          title="Notifications"
        >
          <Heart className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-pink-500" />
        </Link>
        <Link
          href="/messages"
          className="p-2 rounded-full text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all md:hidden"
          title="Messages"
        >
          <MessageSquare className="w-5 h-5" />
        </Link>
      </div>
    </header>
  )
}
