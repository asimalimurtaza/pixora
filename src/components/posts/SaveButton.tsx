'use client'

import React, { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { Bookmark } from 'lucide-react'

interface SaveButtonProps {
  postId: string
  initialSaved: boolean
}

export function SaveButton({ postId, initialSaved }: SaveButtonProps) {
  const [saved, setSaved] = useState(initialSaved)
  const { showToast } = useToast()
  const supabase = createClient()

  const handleSaveToggle = async (e: React.MouseEvent) => {
    e.stopPropagation()

    const previousSaved = saved
    setSaved(!previousSaved)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setSaved(previousSaved)
        showToast('Please log in to save posts', 'error')
        return
      }

      if (previousSaved) {
        const { error } = await supabase
          .from('saved_posts')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', postId)

        if (error) {
          setSaved(previousSaved)
          showToast(error.message, 'error')
        } else {
          showToast('Removed from saved posts', 'info')
        }
      } else {
        const { error } = await supabase.from('saved_posts').insert({
          user_id: user.id,
          post_id: postId,
        })

        if (error) {
          setSaved(previousSaved)
          showToast(error.message, 'error')
        } else {
          showToast('Saved to your collection!', 'success')
        }
      }
    } catch (err: any) {
      setSaved(previousSaved)
      showToast(err.message || 'Save action failed', 'error')
    }
  }

  return (
    <button
      onClick={handleSaveToggle}
      className={`p-2 rounded-full transition-all cursor-pointer ${
        saved
          ? 'text-pink-400 hover:bg-pink-500/10'
          : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
      }`}
      aria-label={saved ? 'Unsave post' : 'Save post'}
    >
      <Bookmark className={`w-5 h-5 ${saved ? 'fill-pink-500 text-pink-500' : ''}`} />
    </button>
  )
}
