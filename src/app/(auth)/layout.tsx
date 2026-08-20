import React from 'react'
import { Sparkles } from 'lucide-react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-950 overflow-hidden">
      {/* Background Decorative Glow Elements */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-pink-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Main Glassmorphic Container */}
      <div className="relative z-10 w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full glass-card border border-white/10 mb-3 shadow-lg">
            <Sparkles className="w-5 h-5 text-pink-400 animate-pulse" />
            <span className="text-xl font-black tracking-wider gradient-text uppercase">Pixora</span>
          </div>
          <p className="text-xs font-medium text-slate-400">
            Share moments, discover stories & connect in real-time
          </p>
        </div>

        {/* Card Content */}
        <div className="glass-card rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/10">
          {children}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-xs text-slate-500 font-medium">
          Pixora Social Media Platform • Powered by Supabase & Next.js
        </div>
      </div>
    </div>
  )
}
