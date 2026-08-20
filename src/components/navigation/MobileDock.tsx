'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Compass, PlusSquare, MessageSquare, User } from 'lucide-react'

interface MobileDockProps {
  username?: string
}

export function MobileDock({ username }: MobileDockProps) {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-4 left-4 right-4 z-40 bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-full px-4 py-2.5 shadow-2xl flex items-center justify-around">
      <Link
        href="/"
        className={`p-2.5 rounded-full transition-all ${
          pathname === '/' ? 'bg-gradient-to-r from-indigo-500 to-sky-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
        }`}
      >
        <Home className="w-5 h-5" />
      </Link>

      <Link
        href="/explore"
        className={`p-2.5 rounded-full transition-all ${
          pathname.startsWith('/explore') ? 'bg-gradient-to-r from-indigo-500 to-sky-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
        }`}
      >
        <Compass className="w-5 h-5" />
      </Link>

      {/* Central Create Trigger */}
      <Link
        href="/create"
        className="p-3 rounded-full bg-gradient-to-tr from-indigo-500 to-sky-500 text-white shadow-xl hover:scale-105 transition-transform"
      >
        <PlusSquare className="w-5 h-5" />
      </Link>

      <Link
        href="/messages"
        className={`p-2.5 rounded-full transition-all ${
          pathname.startsWith('/messages') ? 'bg-gradient-to-r from-indigo-500 to-sky-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
        }`}
      >
        <MessageSquare className="w-5 h-5" />
      </Link>

      <Link
        href={username ? `/profile/${username}` : '/login'}
        className={`p-2.5 rounded-full transition-all ${
          username && pathname.includes(username) ? 'bg-gradient-to-r from-indigo-500 to-sky-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
        }`}
      >
        <User className="w-5 h-5" />
      </Link>
    </nav>
  )
}
