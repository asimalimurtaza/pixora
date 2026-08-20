'use client'

import React, { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { Heart } from 'lucide-react'

interface LikeButtonProps {
  postId: string
  initialLiked: boolean
  initialCount: number
}

export function LikeButton({ postId, initialLiked, initialCount }: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked)
  const [count, setCount] = useState(initialCount)
  const [animating, setAnimating] = useState(false)
  const { showToast } = useToast()
  const supabase = createClient()

  const handleLikeToggle = async (e: React.MouseEvent) => {
    e.stopPropagation()

    const previousLiked = liked
    const previousCount = count

    // Optimistic Update
    setLiked(!previousLiked)
    setCount(previousLiked ? previousCount - 1 : previousCount + 1)
    if (!previousLiked) setAnimating(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        // Revert
        setLiked(previousLiked)
        setCount(previousCount)
        showToast('Please log in to like posts', 'error')
        return
      }

      if (previousLiked) {
        // Unlike
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', postId)

        if (error) {
          setLiked(previousLiked)
          setCount(previousCount)
          showToast(error.message, 'error')
        }
      } else {
        // Like
        const { error } = await supabase.from('likes').insert({
          user_id: user.id,
          post_id: postId,
        })

        if (error) {
          setLiked(previousLiked)
          setCount(previousCount)
          showToast(error.message, 'error')
        }
      }
    } catch (err: any) {
      setLiked(previousLiked)
      setCount(previousCount)
      showToast(err.message || 'Like action failed', 'error')
    } finally {
      setTimeout(() => setAnimating(false), 500)
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={handleLikeToggle}
        className={`p-2 rounded-full transition-all cursor-pointer ${
          liked
            ? 'text-rose-500 hover:bg-rose-500/10'
            : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
        }`}
        aria-label={liked ? 'Unlike post' : 'Like post'}
      >
        <Heart
          className={`w-6 h-6 transition-transform ${
            liked ? 'fill-rose-500 text-rose-500' : ''
          } ${animating ? 'scale-125' : 'scale-100'}`}
        />
      </button>
      <span className="text-xs font-bold text-slate-200">{count}</span>
    </div>
  )
}
