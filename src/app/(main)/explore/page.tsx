import React from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ExploreGrid } from '@/components/explore/ExploreGrid'
import { Compass, Flame, Clock } from 'lucide-react'

interface ExplorePageProps {
  searchParams: Promise<{
    tab?: string
  }>
}

export const metadata = {
  title: 'Explore & Trending • Pixora',
  description: 'Discover trending posts and popular creators across Pixora.',
}

export default async function ExplorePage({ searchParams }: ExplorePageProps) {
  const { tab = 'trending' } = await searchParams
  const supabase = await createClient()

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()

  let rawPosts: any[] = []

  if (tab === 'trending') {
    // Call get_trending_posts RPC
    const { data } = await supabase.rpc('get_trending_posts', {
      p_viewer_id: currentUser?.id ?? undefined,
      p_limit: 18,
    })
    if (data) rawPosts = data as any[]
  } else {
    // Call get_explore_feed RPC
    const { data } = await supabase.rpc('get_explore_feed', {
      p_viewer_id: currentUser?.id ?? undefined,
      p_limit: 18,
    })
    if (data) rawPosts = data as any[]
  }

  // Enrich post results with user, media, likes count, comments count
  const explorePosts = await Promise.all(
    rawPosts.map(async (p: any) => {
      const [{ data: userProfile }, { data: mediaRows }, { count: likesCount }, { count: commentsCount }, { data: userLike }, { data: userSaved }] =
        await Promise.all([
          supabase.from('profiles').select('id, username, display_name, avatar_url').eq('id', p.user_id).single(),
          supabase.from('post_media').select('id, media_url, media_type, position').eq('post_id', p.id).order('position', { ascending: true }),
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
        user: userProfile || { id: p.user_id, username: 'user', display_name: 'User', avatar_url: null },
        media: mediaRows || [],
        likesCount: likesCount || 0,
        commentsCount: commentsCount || 0,
        isLiked: !!userLike,
        isSaved: !!userSaved,
      }
    })
  )

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Compass className="w-6 h-6 text-pink-500" />
          <div>
            <h1 className="text-2xl font-bold text-white">Explore</h1>
            <p className="text-xs text-slate-400">Discover public photos, carousels & popular creators</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 self-start sm:self-auto">
          <Link
            href="/explore?tab=trending"
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              tab === 'trending'
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Flame className="w-4 h-4 text-amber-400" />
            Trending
          </Link>

          <Link
            href="/explore?tab=latest"
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              tab === 'latest'
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4 text-sky-400" />
            Latest
          </Link>
        </div>
      </div>

      {/* Explore Masonry Grid */}
      <ExploreGrid posts={explorePosts as any} currentUserId={currentUser?.id} />
    </div>
  )
}
