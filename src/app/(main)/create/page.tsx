import React from 'react'
import { PlusSquare, Image as ImageIcon } from 'lucide-react'

export const metadata = { title: 'Create Post • Pixora' }

export default function CreatePostPage() {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <PlusSquare className="w-6 h-6 text-pink-500" />
        <h1 className="text-2xl font-bold text-white">Create Post</h1>
      </div>
      <div className="glass-card rounded-3xl p-12 text-center space-y-3 border border-white/10">
        <ImageIcon className="w-10 h-10 text-purple-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">Post Studio Ready</h2>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Upload single images, multi-image carousels, write captions, and set visibility. Storage buckets configured in Phase 2!
        </p>
      </div>
    </div>
  )
}
