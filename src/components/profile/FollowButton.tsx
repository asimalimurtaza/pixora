'use client'

import React, { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { UserPlus, UserCheck, Clock, Loader2 } from 'lucide-react'

interface FollowButtonProps {
  targetUserId: string
  isPrivate: boolean
  initialStatus: 'self' | 'following' | 'requested' | 'none'
  onStatusChange?: (newStatus: 'following' | 'requested' | 'none') => void
}

export function FollowButton({
  targetUserId,
  isPrivate,
  initialStatus,
  onStatusChange,
}: FollowButtonProps) {
  const [status, setStatus] = useState(initialStatus)
  const [loading, setLoading] = useState(false)
  const { showToast } = useToast()
  const supabase = createClient()

  if (status === 'self') return null

  const handleFollowClick = async () => {
    setLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        showToast('Please log in to follow creators', 'error')
        return
      }

      if (status === 'following') {
        // Unfollow
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', targetUserId)

        if (error) {
          showToast(error.message, 'error')
        } else {
          setStatus('none')
          onStatusChange?.('none')
          showToast('Unfollowed user', 'info')
        }
      } else if (status === 'requested') {
        // Cancel follow request
        const { error } = await supabase
          .from('follow_requests')
          .delete()
          .eq('requester_id', user.id)
          .eq('target_user_id', targetUserId)

        if (error) {
          showToast(error.message, 'error')
        } else {
          setStatus('none')
          onStatusChange?.('none')
          showToast('Cancelled follow request', 'info')
        }
      } else {
        // Follow or Request
        if (isPrivate) {
          const { error } = await supabase.from('follow_requests').insert({
            requester_id: user.id,
            target_user_id: targetUserId,
            status: 'pending',
          })

          if (error) {
            showToast(error.message, 'error')
          } else {
            setStatus('requested')
            onStatusChange?.('requested')
            showToast('Follow request sent!', 'success')
          }
        } else {
          const { error } = await supabase.from('follows').insert({
            follower_id: user.id,
            following_id: targetUserId,
          })

          if (error) {
            showToast(error.message, 'error')
          } else {
            setStatus('following')
            onStatusChange?.('following')
            showToast('Following user!', 'success')
          }
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Action failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleFollowClick}
      disabled={loading}
      className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50 ${
        status === 'following'
          ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
          : status === 'requested'
          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
          : 'gradient-btn text-white'
      }`}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : status === 'following' ? (
        <>
          <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
          Following
        </>
      ) : status === 'requested' ? (
        <>
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          Requested
        </>
      ) : (
        <>
          <UserPlus className="w-3.5 h-3.5" />
          Follow
        </>
      )}
    </button>
  )
}
