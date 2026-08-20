'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { X, Search, Loader2 } from 'lucide-react'

interface UserListItem {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
}

interface FollowModalProps {
  userId: string
  type: 'followers' | 'following'
  onClose: () => void
}

export function FollowModal({ userId, type, onClose }: FollowModalProps) {
  const [users, setUsers] = useState<UserListItem[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function loadFollows() {
      setLoading(true)
      try {
        if (type === 'followers') {
          const { data } = await supabase
            .from('follows')
            .select('follower:profiles!follows_follower_id_fkey(id, username, display_name, avatar_url)')
            .eq('following_id', userId)

          if (data) {
            const list = data.map((item: any) => item.follower).filter(Boolean)
            setUsers(list)
          }
        } else {
          const { data } = await supabase
            .from('follows')
            .select('following:profiles!follows_following_id_fkey(id, username, display_name, avatar_url)')
            .eq('follower_id', userId)

          if (data) {
            const list = data.map((item: any) => item.following).filter(Boolean)
            setUsers(list)
          }
        }
      } catch (err) {
        console.error('Error fetching follows list:', err)
      } finally {
        setLoading(false)
      }
    }

    loadFollows()
  }, [supabase, userId, type])

  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      (u.display_name && u.display_name.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="glass-card w-full max-w-md rounded-3xl p-6 border border-white/10 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <h3 className="text-base font-bold text-white capitalize">{type}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search accounts..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          />
        </div>

        {/* User List */}
        <div className="max-h-80 overflow-y-auto space-y-3 pr-1">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 text-pink-500 animate-spin" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <p className="text-center text-xs text-slate-400 py-8">
              No {type} found.
            </p>
          ) : (
            filteredUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-800/50 transition-all">
                <Link
                  href={`/profile/${u.username}`}
                  onClick={onClose}
                  className="flex items-center gap-3 overflow-hidden"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 p-0.5 shrink-0">
                    <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center font-bold text-xs text-white">
                      {u.display_name?.[0]?.toUpperCase() || u.username[0]?.toUpperCase()}
                    </div>
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-white truncate">{u.display_name || u.username}</p>
                    <p className="text-[10px] text-slate-400 truncate">@{u.username}</p>
                  </div>
                </Link>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
