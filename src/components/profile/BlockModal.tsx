'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { ShieldAlert, Loader2, X } from 'lucide-react'

interface BlockModalProps {
  targetUserId: string
  targetUsername: string
  isBlocked: boolean
  onClose: () => void
  onBlockStatusChanged?: (isBlocked: boolean) => void
}

export function BlockModal({
  targetUserId,
  targetUsername,
  isBlocked,
  onClose,
  onBlockStatusChanged,
}: BlockModalProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { showToast } = useToast()
  const supabase = createClient()

  const handleConfirm = async () => {
    setLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        showToast('Please log in to block users', 'error')
        return
      }

      if (isBlocked) {
        // Unblock
        const { error } = await supabase
          .from('blocks')
          .delete()
          .eq('blocker_id', user.id)
          .eq('blocked_id', targetUserId)

        if (error) {
          showToast(error.message, 'error')
        } else {
          showToast(`Unblocked @${targetUsername}`, 'info')
          onBlockStatusChanged?.(false)
          onClose()
          router.refresh()
        }
      } else {
        // Block
        const { error } = await supabase.from('blocks').insert({
          blocker_id: user.id,
          blocked_id: targetUserId,
        })

        if (error) {
          showToast(error.message, 'error')
        } else {
          showToast(`Blocked @${targetUsername}`, 'success')
          onBlockStatusChanged?.(true)
          onClose()
          router.push('/')
          router.refresh()
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Block action failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="glass-card w-full max-w-sm rounded-3xl p-6 border border-white/10 shadow-2xl space-y-4 text-center">
        <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
          <ShieldAlert className="w-6 h-6" />
        </div>

        <div>
          <h3 className="text-lg font-bold text-white">
            {isBlocked ? `Unblock @${targetUsername}?` : `Block @${targetUsername}?`}
          </h3>
          <p className="text-xs text-slate-300 mt-2 leading-relaxed">
            {isBlocked
              ? `Unblocking @${targetUsername} will allow them to view your public profile and posts again.`
              : `Blocking @${targetUsername} will remove all follow relationships between you, and hide their posts across your feed, explore, search, and suggestions.`}
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={`flex-1 py-2.5 rounded-xl text-white text-xs font-semibold cursor-pointer shadow-lg disabled:opacity-50 ${
              isBlocked ? 'gradient-btn' : 'bg-rose-600 hover:bg-rose-500'
            }`}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mx-auto" />
            ) : isBlocked ? (
              'Confirm Unblock'
            ) : (
              'Block User'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
