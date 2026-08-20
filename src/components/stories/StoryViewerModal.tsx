'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { StoryViewersListModal } from './StoryViewersListModal'
import { X, Eye, Trash2, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'

interface StoryItem {
  id: string
  user_id: string
  media_url: string
  media_path: string
  caption: string | null
  created_at: string
  expires_at: string
  has_viewed: boolean
  viewer_count: number
}

interface CreatorGroup {
  user_id: string
  username: string
  display_name: string | null
  avatar_url: string | null
}

interface StoryViewerModalProps {
  initialUserId: string
  creatorList: CreatorGroup[]
  currentUserId?: string
  onClose: () => void
  onStoriesChanged?: () => void
}

export function StoryViewerModal({
  initialUserId,
  creatorList,
  currentUserId,
  onClose,
  onStoriesChanged,
}: StoryViewerModalProps) {
  const [currentCreatorIdx, setCurrentCreatorIdx] = useState(() => {
    const idx = creatorList.findIndex((c) => c.user_id === initialUserId)
    return idx >= 0 ? idx : 0
  })

  const [stories, setStories] = useState<StoryItem[]>([])
  const [activeStoryIdx, setActiveStoryIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isPaused, setIsPaused] = useState(false)
  const [progress, setProgress] = useState(0)
  const [showViewersModal, setShowViewersModal] = useState(false)

  const { showToast } = useToast()
  const supabase = createClient()
  const activeCreator = creatorList[currentCreatorIdx]
  const activeStory = stories[activeStoryIdx]
  const isOwner = currentUserId === activeCreator?.user_id

  // 1. Fetch active stories for current creator
  const loadCreatorStories = useCallback(async () => {
    if (!activeCreator) return
    setLoading(true)
    try {
      const { data } = await supabase.rpc('get_user_active_stories', {
        p_viewer_id: currentUserId || '00000000-0000-0000-0000-000000000000',
        p_target_user_id: activeCreator.user_id,
      })

      if (data && data.length > 0) {
        setStories(data as any)
        setActiveStoryIdx(0)
        setProgress(0)
      } else {
        // Move to next creator if no active stories
        handleNextCreator()
      }
    } catch (err) {
      console.error('Error fetching creator stories:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase, activeCreator, currentUserId])

  useEffect(() => {
    loadCreatorStories()
  }, [loadCreatorStories])

  // 2. Record view when active story changes
  useEffect(() => {
    if (!activeStory || !currentUserId || isOwner) return
    supabase.rpc('record_story_view', { p_story_id: activeStory.id }).then(() => {
      onStoriesChanged?.()
    })
  }, [activeStory, currentUserId, isOwner, supabase, onStoriesChanged])

  // 3. Auto Progress Timer (5 seconds)
  useEffect(() => {
    if (loading || isPaused || !activeStory || showViewersModal) return

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNextStory()
          return 0
        }
        return prev + 2 // 50 steps * 100ms = 5000ms
      })
    }, 100)

    return () => clearInterval(interval)
  }, [loading, isPaused, activeStory, activeStoryIdx, stories.length, showViewersModal])

  const handleNextStory = () => {
    setProgress(0)
    if (activeStoryIdx < stories.length - 1) {
      setActiveStoryIdx((prev) => prev + 1)
    } else {
      handleNextCreator()
    }
  }

  const handlePrevStory = () => {
    setProgress(0)
    if (activeStoryIdx > 0) {
      setActiveStoryIdx((prev) => prev - 1)
    } else if (currentCreatorIdx > 0) {
      setCurrentCreatorIdx((prev) => prev - 1)
    }
  }

  const handleNextCreator = () => {
    if (currentCreatorIdx < creatorList.length - 1) {
      setCurrentCreatorIdx((prev) => prev + 1)
    } else {
      onClose()
    }
  }

  const handleDeleteStory = async () => {
    if (!activeStory || !isOwner || !confirm('Delete this story?')) return

    try {
      // 1. Delete DB record
      const { error } = await supabase.from('stories').delete().eq('id', activeStory.id)

      if (error) {
        showToast(error.message, 'error')
      } else {
        // 2. Delete storage file if path exists
        if (activeStory.media_path) {
          await supabase.storage.from('story-media').remove([activeStory.media_path])
        }
        showToast('Story deleted', 'info')
        onStoriesChanged?.()
        loadCreatorStories()
      }
    } catch (err: any) {
      showToast(err.message || 'Story deletion failed', 'error')
    }
  }

  if (!activeCreator) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl">
      {/* Background Close Click */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 p-2 rounded-full bg-slate-900/80 text-white hover:bg-slate-800 transition-colors cursor-pointer"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Main Story Viewing Container */}
      <div
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
        className="relative w-full max-w-sm h-[85vh] sm:h-[90vh] bg-slate-950 sm:rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col justify-between"
      >
        {/* Progress Bar Segments */}
        <div className="absolute top-3 left-3 right-3 z-30 flex items-center gap-1.5">
          {stories.map((s, idx) => (
            <div key={s.id} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-100 ease-linear"
                style={{
                  width:
                    idx < activeStoryIdx ? '100%' : idx === activeStoryIdx ? `${progress}%` : '0%',
                }}
              />
            </div>
          ))}
        </div>

        {/* Story Header */}
        <div className="absolute top-6 left-3 right-3 z-30 flex items-center justify-between">
          <Link
            href={`/profile/${activeCreator.username}`}
            className="flex items-center gap-2.5 bg-black/40 backdrop-blur-md p-1.5 pr-3 rounded-full border border-white/10"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 p-0.5 shrink-0">
              <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center font-bold text-[10px] text-white overflow-hidden">
                {activeCreator.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={activeCreator.avatar_url}
                    alt={activeCreator.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  activeCreator.display_name?.[0]?.toUpperCase() || activeCreator.username[0]?.toUpperCase()
                )}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-white truncate max-w-[120px]">
                {activeCreator.display_name || activeCreator.username}
              </p>
              {activeStory && (
                <p className="text-[9px] text-slate-300">
                  {new Date(activeStory.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              )}
            </div>
          </Link>

          {/* Delete Button for Owner */}
          {isOwner && activeStory && (
            <button
              onClick={handleDeleteStory}
              className="p-2 rounded-full bg-black/50 text-rose-400 hover:bg-black/80 transition-colors"
              title="Delete Story"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Media Viewport */}
        <div className="relative w-full h-full flex items-center justify-center bg-black">
          {loading ? (
            <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
          ) : activeStory ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeStory.media_url}
                alt="Story Content"
                className="w-full h-full object-cover"
              />

              {/* Caption Overlay */}
              {activeStory.caption && (
                <div className="absolute bottom-16 left-4 right-4 z-20 p-3 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 text-center text-xs text-white">
                  {activeStory.caption}
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-slate-500">No active stories</p>
          )}

          {/* Tap Zones for Navigation */}
          <button
            onClick={handlePrevStory}
            className="absolute left-0 top-16 bottom-16 w-1/3 z-10 opacity-0 cursor-pointer"
          />
          <button
            onClick={handleNextStory}
            className="absolute right-0 top-16 bottom-16 w-1/3 z-10 opacity-0 cursor-pointer"
          />
        </div>

        {/* Bottom Bar: Owner Viewers Button */}
        {isOwner && activeStory && (
          <div className="absolute bottom-4 left-4 right-4 z-30 flex justify-center">
            <button
              onClick={() => {
                setIsPaused(true)
                setShowViewersModal(true)
              }}
              className="px-4 py-2 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-white text-xs font-semibold flex items-center gap-2 hover:bg-black transition-colors cursor-pointer"
            >
              <Eye className="w-4 h-4 text-pink-400" />
              Seen by {activeStory.viewer_count || 0}
            </button>
          </div>
        )}
      </div>

      {/* Creator Navigation Controls for Desktop */}
      {currentCreatorIdx > 0 && (
        <button
          onClick={() => setCurrentCreatorIdx((prev) => prev - 1)}
          className="hidden md:flex absolute left-8 p-3 rounded-full bg-slate-900/80 text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {currentCreatorIdx < creatorList.length - 1 && (
        <button
          onClick={() => setCurrentCreatorIdx((prev) => prev + 1)}
          className="hidden md:flex absolute right-8 p-3 rounded-full bg-slate-900/80 text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Story Viewers List Modal */}
      {showViewersModal && activeStory && (
        <StoryViewersListModal
          storyId={activeStory.id}
          onClose={() => {
            setShowViewersModal(false)
            setIsPaused(false)
          }}
        />
      )}
    </div>
  )
}
