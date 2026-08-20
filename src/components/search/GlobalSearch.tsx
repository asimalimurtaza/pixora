'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useDebounce } from '@/hooks/useDebounce'
import { Search, X, Loader2, User, Image as ImageIcon } from 'lucide-react'

interface UserResult {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
}

interface PostResult {
  id: string
  caption: string | null
  created_at: string
  user: {
    username: string
    display_name: string | null
  }
}

export function GlobalSearch() {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<UserResult[]>([])
  const [posts, setPosts] = useState<PostResult[]>([])

  const debouncedQuery = useDebounce(query.trim(), 300)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function searchDatabase() {
      if (!debouncedQuery) {
        setUsers([])
        setPosts([])
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const [{ data: userRes }, { data: postRes }] = await Promise.all([
          // Search Profiles by username or display_name
          supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url')
            .or(`username.ilike.%${debouncedQuery}%,display_name.ilike.%${debouncedQuery}%`)
            .limit(5),

          // Search Posts by caption
          supabase
            .from('posts')
            .select('id, caption, created_at, user:profiles!posts_user_id_fkey(username, display_name)')
            .ilike('caption', `%${debouncedQuery}%`)
            .limit(5),
        ])

        if (userRes) setUsers(userRes as any)
        if (postRes) setPosts(postRes as any)
      } catch (err) {
        console.error('Search error:', err)
      } finally {
        setLoading(false)
      }
    }

    searchDatabase()
  }, [debouncedQuery, supabase])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.trim()) {
      setIsOpen(false)
      router.push(`/search?q=${encodeURIComponent(query.trim())}`)
    }
  }

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search accounts or posts..."
          className="w-full pl-10 pr-9 py-2 rounded-full glass-input text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('')
              setIsOpen(false)
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Floating Suggestions Dropdown */}
      {isOpen && query.trim() !== '' && (
        <div className="absolute left-0 right-0 top-11 z-50 rounded-2xl glass-card border border-white/10 p-3 shadow-2xl space-y-3">
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 text-pink-500 animate-spin" />
            </div>
          ) : users.length === 0 && posts.length === 0 ? (
            <p className="text-center text-xs text-slate-400 py-4">
              No matching accounts or posts found.
            </p>
          ) : (
            <>
              {/* Accounts Section */}
              {users.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
                    Accounts
                  </p>
                  {users.map((u) => (
                    <Link
                      key={u.id}
                      href={`/profile/${u.username}`}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-800/60 transition-all"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 p-0.5 shrink-0">
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
                        <p className="text-xs font-bold text-white truncate">{u.display_name || u.username}</p>
                        <p className="text-[10px] text-slate-400 truncate">@{u.username}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* Posts Section */}
              {posts.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-slate-800">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
                    Posts
                  </p>
                  {posts.map((p) => (
                    <Link
                      key={p.id}
                      href={`/post/${p.id}`}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-800/60 transition-all"
                    >
                      <div className="p-2 rounded-xl bg-slate-800 text-purple-400 shrink-0">
                        <ImageIcon className="w-4 h-4" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs font-medium text-slate-200 truncate">{p.caption || 'Untitled Post'}</p>
                        <p className="text-[10px] text-slate-400">by @{p.user?.username}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* View All Button */}
              <Link
                href={`/search?q=${encodeURIComponent(query.trim())}`}
                onClick={() => setIsOpen(false)}
                className="block text-center text-xs font-semibold text-pink-400 hover:underline pt-1"
              >
                See all results for &quot;{query.trim()}&quot;
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  )
}
