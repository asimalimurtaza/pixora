'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { FollowButton } from '@/components/profile/FollowButton'
import { Sparkles, Users, Loader2 } from 'lucide-react'

interface SuggestedUser {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  mutual_count?: number
}

interface RightSidebarProps {
  currentUserProfile?: {
    id: string
    username: string
    display_name?: string | null
    avatar_url?: string | null
  } | null
}

export function RightSidebar({ currentUserProfile }: RightSidebarProps) {
  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function loadSuggestions() {
      if (!currentUserProfile?.id) return
      setLoading(true)
      try {
        // Call RPC get_suggested_users
        const { data } = await supabase.rpc('get_suggested_users', {
          p_user_id: currentUserProfile.id,
          p_limit: 5,
        })

        if (data && data.length > 0) {
          setSuggestions(data as any)
        } else {
          // Fallback: fetch popular public profiles
          const { data: fallback } = await supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url')
            .neq('id', currentUserProfile.id)
            .limit(5)

          if (fallback) setSuggestions(fallback as any)
        }
      } catch (err) {
        console.error('Error fetching suggestions:', err)
      } finally {
        setLoading(false)
      }
    }

    loadSuggestions()
  }, [supabase, currentUserProfile])

  return (
    <aside className="hidden lg:block w-80 shrink-0 space-y-6 sticky top-20 self-start pl-4">
      {/* Current User Quick Card */}
      {currentUserProfile && (
        <div className="flex items-center justify-between p-3.5 rounded-2xl glass-card border border-white/10 shadow-lg">
          <Link
            href={`/profile/${currentUserProfile.username}`}
            className="flex items-center gap-3 overflow-hidden"
          >
            <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-pink-500 via-purple-600 to-blue-500 p-0.5 shrink-0 shadow-md">
              <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center font-bold text-xs text-white overflow-hidden">
                {currentUserProfile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentUserProfile.avatar_url}
                    alt={currentUserProfile.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  currentUserProfile.display_name?.[0]?.toUpperCase() || currentUserProfile.username[0]?.toUpperCase()
                )}
              </div>
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate">
                {currentUserProfile.display_name || currentUserProfile.username}
              </p>
              <p className="text-[10px] text-slate-400 truncate">@{currentUserProfile.username}</p>
            </div>
          </Link>

          <Link
            href="/settings"
            className="text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors"
          >
            Switch
          </Link>
        </div>
      )}

      {/* Suggested for You Box */}
      <div className="glass-card rounded-3xl p-5 border border-white/10 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-pink-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Suggested For You
            </h3>
          </div>
          <Link href="/explore" className="text-[10px] font-semibold text-slate-400 hover:text-white">
            See All
          </Link>
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-4 h-4 text-pink-500 animate-spin" />
            </div>
          ) : suggestions.length === 0 ? (
            <p className="text-[11px] text-slate-500 text-center py-2">
              No suggestions available right now.
            </p>
          ) : (
            suggestions.map((u) => (
              <div key={u.id} className="flex items-center justify-between gap-2">
                <Link
                  href={`/profile/${u.username}`}
                  className="flex items-center gap-2.5 overflow-hidden flex-1"
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 p-0.5 shrink-0">
                    <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center font-bold text-[10px] text-white overflow-hidden">
                      {u.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={u.avatar_url} alt={u.username} className="w-full h-full object-cover" />
                      ) : (
                        u.display_name?.[0]?.toUpperCase() || u.username[0]?.toUpperCase()
                      )}
                    </div>
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-white truncate hover:text-pink-400 transition-colors">
                      {u.display_name || u.username}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {u.mutual_count ? `${u.mutual_count} mutual followers` : `@${u.username}`}
                    </p>
                  </div>
                </Link>

                <FollowButton targetUserId={u.id} isPrivate={false} initialStatus="none" />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="px-2 text-[11px] text-slate-500 space-y-2">
        <p className="flex flex-wrap gap-x-2 gap-y-1">
          <Link href="/explore" className="hover:underline">Explore</Link> • 
          <Link href="/saved" className="hover:underline">Saved</Link> • 
          <a href="#" className="hover:underline">Privacy</a> • 
          <a href="#" className="hover:underline">Terms</a>
        </p>
        <p className="text-[10px] flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-pink-500" /> © 2026 PIXORA INC.
        </p>
      </div>
    </aside>
  )
}
