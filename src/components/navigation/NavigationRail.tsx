'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Compass,
  Home,
  PlusSquare,
  Bookmark,
  MessageSquare,
  Settings,
  Sparkles,
  Search,
  Bell,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'

interface NavigationRailProps {
  userProfile?: {
    username: string
    display_name?: string | null
    avatar_url?: string | null
  } | null
}

export function NavigationRail({ userProfile }: NavigationRailProps) {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Load saved sidebar state
  useEffect(() => {
    const saved = localStorage.getItem('pixora-sidebar-collapsed')
    if (saved === 'true') {
      setIsCollapsed(true)
    }
  }, [])

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('pixora-sidebar-collapsed', String(next))
      return next
    })
  }

  const navItems = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'Explore', href: '/explore', icon: Compass },
    { label: 'Search', href: '/search', icon: Search },
    { label: 'Messages', href: '/messages', icon: MessageSquare },
    { label: 'Notifications', href: '/notifications', icon: Bell },
    { label: 'Saved', href: '/saved', icon: Bookmark },
  ]

  return (
    <aside
      className={`hidden md:flex flex-col justify-between shrink-0 h-screen sticky top-0 py-5 border-r border-white/10 bg-slate-950/80 backdrop-blur-2xl z-40 transition-all duration-300 ${
        isCollapsed ? 'w-20 px-2 items-center' : 'w-64 px-4'
      }`}
    >
      <div className="w-full space-y-6">
        {/* Brand Header & Toggle Button */}
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-3">
            <Link href="/" className="group" title="Pixora Home">
              <div className="w-10 h-10 rounded-2xl border border-indigo-500/40 bg-indigo-500/10 p-0.5 shrink-0 shadow-sm group-hover:scale-105 transition-transform flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-sky-400" />
              </div>
            </Link>
            <button
              onClick={toggleCollapse}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer border border-transparent hover:border-slate-800"
              title="Expand Sidebar"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between px-2">
            <Link href="/" className="flex items-center gap-3 overflow-hidden group">
              <div className="w-10 h-10 rounded-2xl border border-indigo-500/40 bg-indigo-500/10 p-0.5 shrink-0 shadow-sm group-hover:scale-105 transition-transform flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-sky-400" />
              </div>
              <span className="text-xl font-black tracking-wider gradient-text uppercase truncate">
                Pixora
              </span>
            </Link>

            <button
              onClick={toggleCollapse}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer border border-transparent hover:border-slate-800"
              title="Collapse Sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation Items (Outlined Styling) */}
        <nav className="space-y-1.5 w-full">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                title={isCollapsed ? item.label : undefined}
                className={`flex items-center gap-4 px-3.5 py-3 rounded-2xl transition-all cursor-pointer group ${
                  isCollapsed ? 'justify-center' : ''
                } ${
                  isActive
                    ? 'active-nav-item border border-indigo-500/40 bg-indigo-500/10 text-sky-400 font-bold shadow-xs'
                    : 'border border-transparent text-slate-400 hover:text-white hover:bg-slate-900/50 hover:border-slate-800/80'
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-sky-400' : ''}`} />
                {!isCollapsed && <span className="text-xs truncate">{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Outlined Create Action */}
        <Link
          href="/create"
          title={isCollapsed ? 'Create Post' : undefined}
          className={`flex items-center gap-3 w-full p-3 rounded-2xl border border-indigo-500/50 bg-indigo-500/10 hover:bg-indigo-500/20 text-sky-300 text-xs font-bold transition-all cursor-pointer ${
            isCollapsed ? 'justify-center' : 'justify-start'
          }`}
        >
          <PlusSquare className="w-5 h-5 shrink-0 text-sky-400" />
          {!isCollapsed && <span className="truncate">Create Post</span>}
        </Link>
      </div>

      {/* Footer Settings & Profile */}
      <div className="w-full space-y-2 pt-4 border-t border-slate-900">
        <Link
          href="/settings"
          title={isCollapsed ? 'Settings' : undefined}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-900/50 transition-all border border-transparent hover:border-slate-800 ${
            isCollapsed ? 'justify-center' : ''
          }`}
        >
          <Settings className="w-5 h-5 shrink-0" />
          {!isCollapsed && <span className="text-xs font-semibold truncate">Settings</span>}
        </Link>

        {userProfile && (
          <Link
            href={`/profile/${userProfile.username}`}
            title={isCollapsed ? `@${userProfile.username}` : undefined}
            className={`flex items-center gap-3 p-2 rounded-2xl hover:bg-slate-900/50 border border-transparent hover:border-slate-800 transition-all overflow-hidden ${
              isCollapsed ? 'justify-center' : ''
            }`}
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-sky-500 p-0.5 shrink-0">
              <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center font-bold text-xs text-white overflow-hidden">
                {userProfile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={userProfile.avatar_url} alt={userProfile.username} className="w-full h-full object-cover" />
                ) : (
                  userProfile.display_name?.[0]?.toUpperCase() || userProfile.username[0]?.toUpperCase()
                )}
              </div>
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden min-w-0">
                <p className="text-xs font-bold text-white truncate">
                  {userProfile.display_name || userProfile.username}
                </p>
                <p className="text-[10px] text-slate-400 truncate">@{userProfile.username}</p>
              </div>
            )}
          </Link>
        )}
      </div>
    </aside>
  )
}
