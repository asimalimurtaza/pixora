import React from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PostCard } from '@/components/posts/PostCard'
import { FollowButton } from '@/components/profile/FollowButton'
import { Search, User } from 'lucide-react'

interface SearchPageProps {
  searchParams: Promise<{
    q?: string
    tab?: string
  }>
}

export async function generateMetadata({ searchParams }: SearchPageProps) {
  const { q } = await searchParams
  return {
    title: q ? `Search: "${q}" • Zeloria` : 'Search • Zeloria',
  }
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q = '', tab = 'users' } = await searchParams
  const query = q.trim()
  const supabase = await createClient()

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()

  let userResults: any[] = []
  let postResults: any[] = []

  if (query) {
    // 1. Query Profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .limit(20)

    if (profiles) userResults = profiles

    // 2. Query Posts
    const { data: posts } = await supabase
      .from('posts')
      .select(`
        id,
        user_id,
        caption,
        visibility,
        created_at,
        user:profiles!posts_user_id_fkey(id, username, display_name, avatar_url),
        media:post_media(id, media_url, media_type, position)
      `)
      .ilike('caption', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(20)

    if (posts) {
      postResults = await Promise.all(
        posts.map(async (p: any) => {
          const sortedMedia = (p.media || []).sort((a: any, b: any) => a.position - b.position)
          const [{ count: likesCount }, { count: commentsCount }, { data: userLike }, { data: userSaved }] =
            await Promise.all([
              supabase.from('likes').select('*', { count: 'exact', head: true }).eq('post_id', p.id),
              supabase.from('comments').select('*', { count: 'exact', head: true }).eq('post_id', p.id),
              currentUser
                ? supabase.from('likes').select('*').eq('post_id', p.id).eq('user_id', currentUser.id).single()
                : Promise.resolve({ data: null }),
              currentUser
                ? supabase.from('saved_posts').select('*').eq('post_id', p.id).eq('user_id', currentUser.id).single()
                : Promise.resolve({ data: null }),
            ])

          return {
            ...p,
            media: sortedMedia,
            likesCount: likesCount || 0,
            commentsCount: commentsCount || 0,
            isLiked: !!userLike,
            isSaved: !!userSaved,
          }
        })
      )
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Search className="w-6 h-6 text-fuchsia-400" />
        <h1 className="text-2xl font-bold text-white">Search Results</h1>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-8 text-xs font-semibold">
        <Link
          href={`/search?q=${encodeURIComponent(query)}&tab=users`}
          className={`py-3 border-b-2 transition-colors ${
            tab === 'users' ? 'border-fuchsia-500 text-fuchsia-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          ACCOUNTS ({userResults.length})
        </Link>
        <Link
          href={`/search?q=${encodeURIComponent(query)}&tab=posts`}
          className={`py-3 border-b-2 transition-colors ${
            tab === 'posts' ? 'border-fuchsia-500 text-fuchsia-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          POSTS ({postResults.length})
        </Link>
      </div>

      {/* Content */}
      {tab === 'users' ? (
        <div className="space-y-3">
          {userResults.length === 0 ? (
            <div className="glass-card rounded-3xl p-12 text-center space-y-3 border border-white/10 shadow-xl">
              <User className="w-10 h-10 text-slate-500 mx-auto" />
              <h3 className="text-base font-bold text-white">No Accounts Found</h3>
              <p className="text-xs text-slate-400">Try searching for a different username or display name.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {userResults.map((u) => (
                <div
                  key={u.id}
                  className="glass-card p-4 rounded-2xl border border-white/10 hover:border-fuchsia-500/40 flex items-center justify-between gap-4 transition-all"
                >
                  <Link
                    href={`/profile/${u.username}`}
                    className="flex items-center gap-3 overflow-hidden flex-1"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-fuchsia-500 to-purple-600 p-0.5 shrink-0 shadow-md">
                      <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center font-bold text-sm text-white overflow-hidden">
                        {u.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={u.avatar_url} alt={u.username} className="w-full h-full object-cover" />
                        ) : (
                          u.display_name?.[0]?.toUpperCase() || u.username[0]?.toUpperCase()
                        )}
                      </div>
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-sm font-bold text-white truncate">{u.display_name || u.username}</p>
                      <p className="text-xs text-fuchsia-400 truncate">@{u.username}</p>
                      {u.bio && <p className="text-[11px] text-slate-400 truncate mt-0.5">{u.bio}</p>}
                    </div>
                  </Link>

                  {currentUser?.id !== u.id && (
                    <FollowButton targetUserId={u.id} isPrivate={u.is_private} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6 max-w-xl mx-auto">
          {postResults.length === 0 ? (
            <div className="glass-card rounded-3xl p-12 text-center space-y-3 border border-white/10 shadow-xl">
              <Search className="w-10 h-10 text-slate-500 mx-auto" />
              <h3 className="text-base font-bold text-white">No Posts Found</h3>
              <p className="text-xs text-slate-400">Try searching for different caption keywords.</p>
            </div>
          ) : (
            postResults.map((post) => <PostCard key={post.id} post={post} currentUserId={currentUser?.id} />)
          )}
        </div>
      )}
    </div>
  )
}
