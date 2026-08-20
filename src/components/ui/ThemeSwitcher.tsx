'use client'

import React from 'react'
import { useTheme, ThemeMode } from '@/components/providers/ThemeProvider'
import { Sun, Moon, Laptop } from 'lucide-react'

export function ThemeSwitcher() {
  const { themeMode, setThemeMode } = useTheme()

  const modes: { id: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { id: 'dark', label: 'Dark', icon: <Moon className="w-3.5 h-3.5" /> },
    { id: 'light', label: 'Light', icon: <Sun className="w-3.5 h-3.5" /> },
    { id: 'system', label: 'System', icon: <Laptop className="w-3.5 h-3.5" /> },
  ]

  return (
    <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-2xl border border-slate-800/80">
      {modes.map((m) => {
        const isActive = themeMode === m.id
        return (
          <button
            key={m.id}
            onClick={() => setThemeMode(m.id)}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              isActive
                ? 'bg-gradient-to-r from-indigo-500 to-sky-500 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {m.icon}
            {m.label}
          </button>
        )
      })}
    </div>
  )
}
