import React from 'react'

export function FeedSkeleton() {
  return (
    <div className="space-y-6 max-w-xl mx-auto">
      {[1, 2].map((i) => (
        <div key={i} className="glass-card rounded-3xl p-4 border border-white/10 space-y-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-800" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3.5 bg-slate-800 rounded-md w-32" />
              <div className="h-2.5 bg-slate-800 rounded-md w-20" />
            </div>
          </div>
          <div className="aspect-square w-full rounded-2xl bg-slate-800" />
          <div className="space-y-2">
            <div className="h-3 bg-slate-800 rounded-md w-48" />
            <div className="h-3 bg-slate-800 rounded-md w-3/4" />
          </div>
        </div>
      ))}
    </div>
  )
}
