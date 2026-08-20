'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

export type ThemeMode = 'dark' | 'light' | 'system'

interface ThemeContextType {
  themeMode: ThemeMode
  setThemeMode: (mode: ThemeMode) => void
  activeTheme: 'dark' | 'light'
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark')
  const [activeTheme, setActiveTheme] = useState<'dark' | 'light'>('dark')

  const applyTheme = (mode: ThemeMode) => {
    let resolved: 'dark' | 'light' = 'dark'
    if (mode === 'system') {
      resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    } else {
      resolved = mode
    }

    setActiveTheme(resolved)

    if (resolved === 'light') {
      document.documentElement.classList.add('light-theme')
      document.documentElement.classList.remove('dark')
    } else {
      document.documentElement.classList.remove('light-theme')
      document.documentElement.classList.add('dark')
    }
  }

  useEffect(() => {
    const savedMode = (localStorage.getItem('zeloria-theme-mode') as ThemeMode) || 'dark'
    setThemeModeState(savedMode)
    applyTheme(savedMode)

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleSystemChange = () => {
      if (localStorage.getItem('zeloria-theme-mode') === 'system') {
        applyTheme('system')
      }
    }

    mediaQuery.addEventListener('change', handleSystemChange)
    return () => mediaQuery.removeEventListener('change', handleSystemChange)
  }, [])

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode)
    localStorage.setItem('zeloria-theme-mode', mode)
    applyTheme(mode)
  }

  return (
    <ThemeContext.Provider value={{ themeMode, setThemeMode, activeTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
