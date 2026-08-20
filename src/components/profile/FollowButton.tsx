'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { UserPlus, UserCheck, Clock, Loader2 } from 'lucide-react'

interface FollowButtonProps {
  targetUserId: string
  isPrivate?: boolean
  initialStatus?: 'self' | 'following' | 'requested' | 'none'
  onStatusChange?: (newStatus: 'following' | 'requested' | 'none') => void
}

export function FollowButton({
  targetUserId,
  isPrivate = false,
  initialStatus = 'none',
  onStatusChange,
}: FollowButtonProps) {
  const [status, setStatus] = useState<'self' | 'following' | 'requested' | 'none'>(initialStatus)
  const [loading, setLoading] = useState(false)
  const { showToast } = useToast()
  const supabase = createClient()

  // Dynamically query actual follow status on mount
  useEffect(() => {
    async function checkStatus() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      if (user.id === targetUserId) {
        setStatus('self')
        return
      }

      // 1. Check follows table
      const { data: follow } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId)
        .maybeSingle()

      if (follow) {
        setStatus('following')
        return
      }

      // 2. Check pending follow_requests
      const { data: req } = await supabase
        .from('follow_requests')
        .select('id')
        .eq('requester_id', user.id)
        .eq('target_id', targetUserId)
        .eq('status', 'pending')
        .maybeSingle()

      if (req) {
        setStatus('requested')
      } else {
        setStatus('none')
      }
    }

    checkStatus()
  }, [supabase, targetUserId])

  if (status === 'self') return null

  const handleFollowClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

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
          .eq('target_id', targetUserId)

        if (error) {
          showToast(error.message, 'error')
        } else {
          setStatus('none')
          onStatusChange?.('none')
          showToast('Cancelled follow request', 'info')
        }
      } else {
        // Send follow or request via send_follow_request RPC
        const { data, error } = await supabase.rpc('send_follow_request', {
          p_target_id: targetUserId,
        })

        if (error) {
          showToast(error.message, 'error')
        } else if (data) {
          const resObj = data as any
          const newStatus = resObj.status === 'requested' ? 'requested' : 'following'
          setStatus(newStatus)
          onStatusChange?.(newStatus)
          showToast(
            newStatus === 'requested' ? 'Follow request sent!' : 'Following creator!',
            'success'
          )
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
      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50 ${
        status === 'following'
          ? 'border border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-400 hover:bg-fuchsia-500/20'
          : status === 'requested'
          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
          : 'gradient-btn text-white'
      }`}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : status === 'following' ? (
        <>
          <UserCheck className="w-3.5 h-3.5 text-fuchsia-400" />
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
