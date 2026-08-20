'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { useTheme } from '@/components/providers/ThemeProvider'
import {
  Home,
  Compass,
  PlusSquare,
  MessageSquare,
  Heart,
  User,
  LogOut,
  Sparkles,
  Sun,
  Moon,
  Bookmark,
} from 'lucide-react'

interface SidebarProps {
  userProfile?: {
    username: string
    display_name?: string | null
    avatar_url?: string | null
  } | null
}

export function Sidebar({ userProfile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { showToast } = useToast()
  const { theme, toggleTheme } = useTheme()
  const supabase = createClient()

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      showToast('Logged out successfully', 'info')
      router.push('/login')
      router.refresh()
    } catch (err: any) {
      showToast(err.message || 'Logout failed', 'error')
    }
  }

  const profilePath = userProfile ? `/profile/${userProfile.username}` : '/login'

  const navItems = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'Explore', href: '/explore', icon: Compass },
    { label: 'Create', href: '/create', icon: PlusSquare },
    { label: 'Messages', href: '/messages', icon: MessageSquare },
    { label: 'Notifications', href: '/notifications', icon: Heart },
    { label: 'Saved', href: '/saved', icon: Bookmark },
    { label: 'Profile', href: profilePath, icon: User },
  ]

  return (
    <aside className="hidden md:flex flex-col justify-between w-64 h-screen sticky top-0 border-r border-slate-800/60 bg-slate-900/50 backdrop-blur-xl p-4 z-40">
      <div className="space-y-6">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 px-3 py-2">
          <Sparkles className="w-6 h-6 text-pink-500 animate-pulse" />
          <span className="text-2xl font-black tracking-wider gradient-text uppercase">Pixora</span>
        </Link>

        {/* Nav Links */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || (item.label === 'Profile' && pathname.startsWith('/profile'))
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-4 px-3.5 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-white border border-pink-500/30 shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-pink-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Footer Controls */}
      <div className="space-y-3 pt-4 border-t border-slate-800/60">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-4 px-3.5 py-2.5 rounded-2xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all cursor-pointer"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-400" />}
          <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>

        {/* User Card & Logout */}
        {userProfile && (
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-800/40 border border-slate-700/50">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 p-0.5 shrink-0">
                <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center font-bold text-xs text-white">
                  {userProfile.display_name?.[0]?.toUpperCase() || userProfile.username[0]?.toUpperCase() || 'U'}
                </div>
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-white truncate">
                  {userProfile.display_name || userProfile.username}
                </p>
                <p className="text-[10px] text-slate-400 truncate">@{userProfile.username}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer shrink-0"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
