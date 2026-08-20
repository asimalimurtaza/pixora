import React from 'react'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-slate-950 text-slate-100 p-4 sm:p-6 md:p-8">
      {/* Top Header */}
      <header className="w-full max-w-md mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-fuchsia-500 to-purple-600 p-0.5 shadow-lg group-hover:scale-105 transition-transform">
            <div className="w-full h-full rounded-[14px] bg-slate-900 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-fuchsia-400" />
            </div>
          </div>
          <span className="text-xl font-black tracking-wider gradient-text uppercase">Zeloria</span>
        </Link>
      </header>

      {/* Main Form Center */}
      <main className="w-full max-w-md mx-auto my-8">{children}</main>

      {/* Footer */}
      <footer className="w-full max-w-md mx-auto text-center text-xs text-slate-400 space-y-1">
        <p>© 2026 Zeloria Inc. All rights reserved.</p>
        <p className="text-[10px] text-slate-400">
          Zeloria Social Media Platform • Powered by Supabase & Next.js
        </p>
      </footer>
    </div>
  )
}
