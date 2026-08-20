'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { X, Check, Loader2 } from 'lucide-react'

interface RequestItem {
  id: string
  requester: {
    id: string
    username: string
    display_name: string | null
    avatar_url: string | null
  }
}

interface FollowRequestsModalProps {
  onClose: () => void
  onRequestHandled?: () => void
}

export function FollowRequestsModal({ onClose, onRequestHandled }: FollowRequestsModalProps) {
  const [requests, setRequests] = useState<RequestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  
  const { showToast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    async function loadRequests() {
      setLoading(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data } = await supabase
        .from('follow_requests')
        .select('id, requester:profiles!follow_requests_requester_id_fkey(id, username, display_name, avatar_url)')
        .eq('target_user_id', user.id)
        .eq('status', 'pending')

      if (data) {
        setRequests(data as any)
      }
      setLoading(false)
    }

    loadRequests()
  }, [supabase])

  const handleAction = async (requestId: string, status: 'accepted' | 'rejected') => {
    setActionLoadingId(requestId)
    try {
      const { error } = await supabase
        .from('follow_requests')
        .update({ status })
        .eq('id', requestId)

      if (error) {
        showToast(error.message, 'error')
      } else {
        setRequests((prev) => prev.filter((r) => r.id !== requestId))
        showToast(`Request ${status}`, 'success')
        onRequestHandled?.()
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update request', 'error')
    } finally {
      setActionLoadingId(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="glass-card w-full max-w-md rounded-3xl p-6 border border-white/10 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <h3 className="text-base font-bold text-white">Pending Follow Requests</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto space-y-3 pr-1">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 text-pink-500 animate-spin" />
            </div>
          ) : requests.length === 0 ? (
            <p className="text-center text-xs text-slate-400 py-8">
              No pending follow requests.
            </p>
          ) : (
            requests.map((req) => (
              <div key={req.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
                <Link
                  href={`/profile/${req.requester.username}`}
                  onClick={onClose}
                  className="flex items-center gap-3 overflow-hidden"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 p-0.5 shrink-0">
                    <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center font-bold text-xs text-white">
                      {req.requester.display_name?.[0]?.toUpperCase() || req.requester.username[0]?.toUpperCase()}
                    </div>
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-white truncate">{req.requester.display_name || req.requester.username}</p>
                    <p className="text-[10px] text-slate-400 truncate">@{req.requester.username}</p>
                  </div>
                </Link>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAction(req.id, 'accepted')}
                    disabled={actionLoadingId === req.id}
                    className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-all border border-emerald-500/40 cursor-pointer disabled:opacity-50"
                    title="Accept"
                  >
                    {actionLoadingId === req.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => handleAction(req.id, 'rejected')}
                    disabled={actionLoadingId === req.id}
                    className="p-2 rounded-xl bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 transition-all border border-rose-500/40 cursor-pointer disabled:opacity-50"
                    title="Reject"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
