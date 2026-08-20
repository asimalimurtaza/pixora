import React from 'react'
import { MessageSquare, Zap } from 'lucide-react'

export const metadata = { title: 'Direct Messages • Pixora' }

export default function MessagesPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <MessageSquare className="w-6 h-6 text-pink-500" />
        <h1 className="text-2xl font-bold text-white">Direct Messages</h1>
      </div>
      <div className="glass-card rounded-3xl p-12 text-center space-y-3 border border-white/10">
        <Zap className="w-10 h-10 text-amber-400 mx-auto animate-pulse" />
        <h2 className="text-lg font-bold text-white">Realtime Chat Engine</h2>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Supabase Realtime WebSockets, Presence online status, typing indicators, and direct messaging ready for Phase 4!
        </p>
      </div>
    </div>
  )
}
