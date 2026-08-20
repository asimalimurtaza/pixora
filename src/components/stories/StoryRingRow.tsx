'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CreateStoryModal } from './CreateStoryModal'
import { StoryViewerModal } from './StoryViewerModal'
import { PlusSquare, Loader2 } from 'lucide-react'

interface ActiveCreator {
  user_id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  total_stories: number
  has_unseen: boolean
  latest_created_at: string
}

interface StoryRingRowProps {
  currentUserId?: string
}

export function StoryRingRow({ currentUserId }: StoryRingRowProps) {
  const [creators, setCreators] = useState<ActiveCreator[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(null)

  const supabase = createClient()

  const loadFeedStories = useCallback(async () => {
    if (!currentUserId) return
    setLoading(true)
    try {
      const { data } = await supabase.rpc('get_feed_active_stories', {
        p_viewer_id: currentUserId,
      })

      if (data) setCreators(data as any)
    } catch (err) {
      console.error('Error fetching feed stories:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase, currentUserId])

  useEffect(() => {
    loadFeedStories()
  }, [loadFeedStories])

  return (
    <div className="p-4 rounded-3xl glass-card border border-white/10 shadow-lg overflow-x-auto">
      <div className="flex items-center gap-4">
        {/* Your Story Create Button */}
        <div
          onClick={() => setShowCreateModal(true)}
          className="flex flex-col items-center gap-1 shrink-0 cursor-pointer group"
        >
          <div className="w-14 h-14 rounded-full bg-slate-800 border-2 border-dashed border-pink-500 flex items-center justify-center text-pink-400 group-hover:scale-105 transition-transform shadow-md">
            <PlusSquare className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-semibold text-slate-300">Your Story</span>
        </div>

        {/* Creator Story Rings */}
        {loading ? (
          <div className="flex items-center py-2">
            <Loader2 className="w-5 h-5 text-pink-500 animate-spin" />
          </div>
        ) : (
          creators.map((c) => {
            const isOwn = c.user_id === currentUserId

            return (
              <div
                key={c.user_id}
                onClick={() => setSelectedCreatorId(c.user_id)}
                className="flex flex-col items-center gap-1 shrink-0 cursor-pointer group"
              >
                {/* Ring Highlight: Unseen = Vibrant Gradient; Viewed = Muted Slate */}
                <div
                  className={`w-14 h-14 rounded-full p-0.5 group-hover:scale-105 transition-transform shadow-md ${
                    c.has_unseen
                      ? 'bg-gradient-to-tr from-pink-500 via-purple-500 to-amber-500'
                      : 'bg-slate-700'
                  }`}
                >
                  <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center font-bold text-xs text-white overflow-hidden">
                    {c.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.avatar_url} alt={c.username} className="w-full h-full object-cover" />
                    ) : (
                      c.display_name?.[0]?.toUpperCase() || c.username[0]?.toUpperCase()
                    )}
                  </div>
                </div>

                <span className="text-[10px] font-medium text-slate-300 truncate max-w-[65px]">
                  {isOwn ? 'You' : c.username}
                </span>
              </div>
            )
          })
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateStoryModal
          onClose={() => setShowCreateModal(false)}
          onStoryCreated={loadFeedStories}
        />
      )}

      {selectedCreatorId && (
        <StoryViewerModal
          initialUserId={selectedCreatorId}
          creatorList={creators}
          currentUserId={currentUserId}
          onClose={() => setSelectedCreatorId(null)}
          onStoriesChanged={loadFeedStories}
        />
      )}
    </div>
  )
}
