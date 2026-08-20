'use client'

import React from 'react'
import Link from 'next/link'
import { Sparkles, Heart, MessageSquare } from 'lucide-react'
import { GlobalSearch } from '@/components/search/GlobalSearch'
import { ThemeSwitcher } from '@/components/ui/ThemeSwitcher'

export function Header() {
  return (
    <header className="sticky top-0 z-30 w-full bg-slate-950/70 backdrop-blur-2xl border-b border-white/10 px-4 py-3 flex items-center justify-between gap-4">
      {/* Mobile Brand Logo */}
      <Link href="/" className="flex md:hidden items-center gap-2 shrink-0">
        <Sparkles className="w-5 h-5 text-sky-400" />
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
          className="relative p-2.5 rounded-full text-slate-300 hover:text-white hover:bg-slate-900 transition-all"
          title="Notifications"
        >
          <Heart className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-sky-400 shadow-md shadow-sky-400/50" />
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
