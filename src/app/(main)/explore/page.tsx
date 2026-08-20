import React from 'react'
import { Compass, Sparkles } from 'lucide-react'

export const metadata = { title: 'Explore • Pixora' }

export default function ExplorePage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Compass className="w-6 h-6 text-pink-500" />
        <h1 className="text-2xl font-bold text-white">Explore</h1>
      </div>
      <div className="glass-card rounded-3xl p-12 text-center space-y-3 border border-white/10">
        <Sparkles className="w-8 h-8 text-pink-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">Explore Feed Online</h2>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Discover trending posts, public photos, and creators across the Pixora network. Ready for Phase 3!
        </p>
      </div>
    </div>
  )
}
