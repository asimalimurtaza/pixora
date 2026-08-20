'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Compass, PlusSquare, MessageSquare, User } from 'lucide-react'

interface MobileNavProps {
  username?: string
}

export function MobileNav({ username }: MobileNavProps) {
  const pathname = usePathname()
  const profilePath = username ? `/profile/${username}` : '/login'

  const navItems = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'Explore', href: '/explore', icon: Compass },
    { label: 'Create', href: '/create', icon: PlusSquare },
    { label: 'Messages', href: '/messages', icon: MessageSquare },
    { label: 'Profile', href: profilePath, icon: User },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/90 backdrop-blur-xl border-t border-slate-800/80 px-4 py-2 flex items-center justify-around">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href || (item.label === 'Profile' && pathname.startsWith('/profile'))
        return (
          <Link
            key={item.label}
            href={item.href}
            className={`p-2.5 rounded-xl transition-all ${
              isActive ? 'text-pink-400 bg-pink-500/10' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon className="w-6 h-6" />
          </Link>
        )
      })}
    </nav>
  )
}
