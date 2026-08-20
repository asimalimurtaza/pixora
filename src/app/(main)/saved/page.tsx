import React from 'react'
import { Bookmark, Shield } from 'lucide-react'

export const metadata = { title: 'Saved Posts • Pixora' }

export default function SavedPostsPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Bookmark className="w-6 h-6 text-pink-500" />
        <h1 className="text-2xl font-bold text-white">Saved Posts</h1>
      </div>
      <div className="glass-card rounded-3xl p-12 text-center space-y-3 border border-white/10">
        <Shield className="w-8 h-8 text-slate-500 mx-auto" />
        <h2 className="text-lg font-bold text-white">No Saved Posts</h2>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Posts you save will be securely protected under your user RLS policies and appear here.
        </p>
      </div>
    </div>
  )
}
