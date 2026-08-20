'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { X, Eye, Loader2 } from 'lucide-react'

interface StoryViewerItem {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  viewed_at: string
}

interface StoryViewersListModalProps {
  storyId: string
  onClose: () => void
}

export function StoryViewersListModal({ storyId, onClose }: StoryViewersListModalProps) {
  const [viewers, setViewers] = useState<StoryViewerItem[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function loadViewers() {
      setLoading(true)
      try {
        const { data } = await supabase.rpc('get_story_viewers', {
          p_story_id: storyId,
        })
        if (data) setViewers(data as any)
      } catch (err) {
        console.error('Error fetching story viewers:', err)
      } finally {
        setLoading(false)
      }
    }

    loadViewers()

    // Selective Realtime listener for new views on this story
    const channel = supabase
      .channel(`story-views:${storyId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'story_views',
          filter: `story_id=eq.${storyId}`,
        },
        () => {
          loadViewers()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, storyId])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="glass-card w-full max-w-sm rounded-3xl p-5 border border-white/10 shadow-2xl space-y-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-pink-400" />
            <h3 className="text-sm font-bold text-white">Story Viewers ({viewers.length})</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 text-pink-500 animate-spin" />
            </div>
          ) : viewers.length === 0 ? (
            <p className="text-center text-xs text-slate-400 py-6">No viewers yet.</p>
          ) : (
            viewers.map((u) => (
              <Link
                key={u.id}
                href={`/profile/${u.username}`}
                onClick={onClose}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-800/60 transition-all"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 p-0.5 shrink-0">
                    <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center font-bold text-[10px] text-white overflow-hidden">
                      {u.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={u.avatar_url} alt={u.username} className="w-full h-full object-cover" />
                      ) : (
                        u.display_name?.[0]?.toUpperCase() || u.username[0]?.toUpperCase()
                      )}
                    </div>
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-white truncate">{u.display_name || u.username}</p>
                    <p className="text-[10px] text-slate-400 truncate">@{u.username}</p>
                  </div>
                </div>
                <span className="text-[9px] text-slate-500 shrink-0">
                  {new Date(u.viewed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
