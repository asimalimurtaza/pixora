import React from 'react'
import { Heart, BellRing } from 'lucide-react'

export const metadata = { title: 'Notifications • Pixora' }

export default function NotificationsPage() {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Heart className="w-6 h-6 text-pink-500" />
        <h1 className="text-2xl font-bold text-white">Notifications</h1>
      </div>
      <div className="glass-card rounded-3xl p-12 text-center space-y-3 border border-white/10">
        <BellRing className="w-10 h-10 text-pink-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">No New Notifications</h2>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Automated PostgreSQL triggers will generate real-time alerts when creators follow, like, or comment on your content.
        </p>
      </div>
    </div>
  )
}
