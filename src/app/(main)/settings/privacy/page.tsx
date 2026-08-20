'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { Lock, Globe, ShieldAlert, Check, X, UserMinus, ArrowLeft, Loader2, Users } from 'lucide-react'

interface FollowRequest {
  id: string
  requester_id: string
  created_at: string
  requester: {
    id: string
    username: string
    display_name: string | null
    avatar_url: string | null
  }
}

interface BlockedUser {
  id: string
  blocked_id: string
  blocked: {
    id: string
    username: string
    display_name: string | null
    avatar_url: string | null
  }
}

export default function PrivacySettingsPage() {
  const [isPrivate, setIsPrivate] = useState(false)
  const [requests, setRequests] = useState<FollowRequest[]>([])
  const [blockedList, setBlockedList] = useState<BlockedUser[]>([])
  const [activeTab, setActiveTab] = useState<'privacy' | 'requests' | 'blocked'>('privacy')
  const [loading, setLoading] = useState(true)

  const router = useRouter()
  const { showToast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      setLoading(true)
      try {
        // Load profile privacy
        const { data: profile, error: profErr } = await supabase
          .from('profiles')
          .select('is_private')
          .eq('id', user.id)
          .single()

        if (profErr) {
          console.error('Error fetching profile privacy:', profErr)
        } else if (profile) {
          setIsPrivate(!!profile.is_private)
        }

        // Load pending follow requests
        const { data: reqData } = await supabase
          .from('follow_requests')
          .select(`
            id,
            requester_id,
            created_at,
            requester:profiles!follow_requests_requester_id_fkey(id, username, display_name, avatar_url)
          `)
          .eq('target_id', user.id)
          .eq('status', 'pending')

        if (reqData) setRequests(reqData as any)

        // Load blocked users
        const { data: blockData } = await supabase
          .from('blocks')
          .select(`
            id,
            blocked_id,
            blocked:profiles!blocks_blocked_id_fkey(id, username, display_name, avatar_url)
          `)
          .eq('blocker_id', user.id)

        if (blockData) setBlockedList(blockData as any)
      } catch (err) {
        console.error('Error loading privacy data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [supabase, router])

  const togglePrivacy = async () => {
    const nextPrivate = !isPrivate
    setIsPrivate(nextPrivate)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { error } = await supabase
          .from('profiles')
          .update({ is_private: nextPrivate })
          .eq('id', user.id)

        if (error) {
          setIsPrivate(!nextPrivate)
          showToast(`Privacy update failed: ${error.message}. Did you run migration 07 in Supabase SQL editor?`, 'error')
        } else {
          showToast(`Account is now ${nextPrivate ? 'Private' : 'Public'}`, 'success')
        }
      }
    } catch (err: any) {
      setIsPrivate(!nextPrivate)
      showToast(err.message || 'Privacy update failed', 'error')
    }
  }

  const handleRespondRequest = async (requestId: string, action: 'accept' | 'decline') => {
    try {
      const { error } = await supabase.rpc('respond_follow_request', {
        p_request_id: requestId,
        p_action: action,
      })

      if (error) {
        showToast(error.message, 'error')
      } else {
        setRequests((prev) => prev.filter((r) => r.id !== requestId))
        showToast(action === 'accept' ? 'Follow request accepted!' : 'Follow request declined', 'info')
      }
    } catch (err: any) {
      showToast(err.message || 'Action failed', 'error')
    }
  }

  const handleUnblock = async (blockId: string) => {
    try {
      const { error } = await supabase.from('blocks').delete().eq('id', blockId)
      if (error) {
        showToast(error.message, 'error')
      } else {
        setBlockedList((prev) => prev.filter((b) => b.id !== blockId))
        showToast('User unblocked', 'info')
      }
    } catch (err: any) {
      showToast(err.message || 'Unblock failed', 'error')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 text-fuchsia-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Account Privacy & Security</h1>
          <p className="text-xs text-slate-400">Manage account privacy, pending follow requests, and blocked accounts.</p>
        </div>
        <Link
          href="/settings"
          className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" /> Settings
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1 rounded-2xl bg-slate-900 border border-slate-800">
        <button
          onClick={() => setActiveTab('privacy')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'privacy'
              ? 'bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Privacy Setting
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'requests'
              ? 'bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Follow Requests
          {requests.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-extrabold">
              {requests.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('blocked')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'blocked'
              ? 'bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Blocked Users ({blockedList.length})
        </button>
      </div>

      {/* Tab 1: Privacy Toggle */}
      {activeTab === 'privacy' && (
        <div className="glass-card rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10 shadow-xl">
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-2xl ${isPrivate ? 'bg-amber-500/20 text-amber-300' : 'bg-fuchsia-500/20 text-fuchsia-300'}`}>
                  {isPrivate ? <Lock className="w-6 h-6" /> : <Globe className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {isPrivate ? 'Private Account' : 'Public Account'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isPrivate
                      ? 'Only approved followers can view your posts, stories, and moments.'
                      : 'Anyone can view your profile and posts.'}
                  </p>
                </div>
              </div>

              <button
                onClick={togglePrivacy}
                className={`w-14 h-7 rounded-full p-1 transition-colors cursor-pointer ${
                  isPrivate ? 'bg-amber-500' : 'bg-slate-800'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    isPrivate ? 'translate-x-7' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Follow Requests */}
      {activeTab === 'requests' && (
        <div className="glass-card rounded-3xl p-6 border border-white/10 shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" /> Pending Follow Requests ({requests.length})
          </h2>

          {requests.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No pending follow requests.</p>
          ) : (
            <div className="space-y-3">
              {requests.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
                  <Link href={`/profile/${r.requester.username}`} className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-fuchsia-500 to-purple-600 p-0.5 shrink-0">
                      <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center font-bold text-xs text-white overflow-hidden">
                        {r.requester.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={r.requester.avatar_url} alt={r.requester.username} className="w-full h-full object-cover" />
                        ) : (
                          r.requester.username[0]?.toUpperCase()
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white hover:text-fuchsia-400 transition-colors">
                        {r.requester.display_name || r.requester.username}
                      </p>
                      <p className="text-[10px] text-slate-400">@{r.requester.username}</p>
                    </div>
                  </Link>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleRespondRequest(r.id, 'accept')}
                      className="px-3 py-1.5 rounded-xl gradient-btn text-white text-xs font-bold flex items-center gap-1 cursor-pointer shadow-md"
                    >
                      <Check className="w-3.5 h-3.5" /> Accept
                    </button>
                    <button
                      onClick={() => handleRespondRequest(r.id, 'decline')}
                      className="px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" /> Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Blocked Users */}
      {activeTab === 'blocked' && (
        <div className="glass-card rounded-3xl p-6 border border-white/10 shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-fuchsia-400" /> Blocked Accounts ({blockedList.length})
          </h2>

          {blockedList.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">You have not blocked any accounts.</p>
          ) : (
            <div className="space-y-3">
              {blockedList.map((b) => (
                <div key={b.id} className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-fuchsia-500 to-purple-600 p-0.5 shrink-0">
                      <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center font-bold text-xs text-white overflow-hidden">
                        {b.blocked?.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={b.blocked.avatar_url} alt={b.blocked.username} className="w-full h-full object-cover" />
                        ) : (
                          b.blocked?.username[0]?.toUpperCase() || 'U'
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">
                        {b.blocked?.display_name || b.blocked?.username}
                      </p>
                      <p className="text-[10px] text-slate-400">@{b.blocked?.username}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleUnblock(b.id)}
                    className="px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <UserMinus className="w-3.5 h-3.5 text-rose-400" /> Unblock
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
