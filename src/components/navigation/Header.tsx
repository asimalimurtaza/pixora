'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Sparkles, Search, Heart, MessageSquare } from 'lucide-react'

export function Header() {
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <header className="sticky top-0 z-30 w-full bg-slate-900/60 backdrop-blur-xl border-b border-slate-800/60 px-4 py-3 flex items-center justify-between gap-4">
      {/* Mobile Logo / Brand */}
      <Link href="/" className="flex md:hidden items-center gap-2">
        <Sparkles className="w-5 h-5 text-pink-500" />
        <span className="text-xl font-black tracking-wider gradient-text uppercase">Pixora</span>
      </Link>

      {/* Global Search Bar */}
      <div className="flex-1 max-w-md mx-auto relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search accounts, posts, hashtags..."
          className="w-full pl-10 pr-4 py-2 rounded-full glass-input text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
        />
      </div>

      {/* Header Quick Actions */}
      <div className="flex items-center gap-2">
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
