import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { ExploreGrid } from '@/components/explore/ExploreGrid'
import { Compass, Sparkles, TrendingUp } from 'lucide-react'

export const metadata = {
  title: 'Explore & Trending • Zeloria',
  description: 'Discover trending posts and popular creators across Zeloria.',
}

export default async function ExplorePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Fetch explore feed posts
  const { data: rawPosts } = await supabase.rpc('get_explore_feed', {
    p_viewer_id: user?.id ?? undefined,
    p_limit: 15,
  })

  let posts: any[] = []
  if (rawPosts && rawPosts.length > 0) {
    posts = await Promise.all(
      (rawPosts as any[]).map(async (p) => {
        const [{ data: userProfile }, { data: mediaRows }, { count: likesCount }, { count: commentsCount }, { data: userLike }, { data: userSaved }] =
          await Promise.all([
            supabase.from('profiles').select('id, username, display_name, avatar_url').eq('id', p.user_id).single(),
            supabase.from('post_media').select('id, media_url, media_type, position').eq('post_id', p.id).order('position', { ascending: true }),
            supabase.from('likes').select('*', { count: 'exact', head: true }).eq('post_id', p.id),
            supabase.from('comments').select('*', { count: 'exact', head: true }).eq('post_id', p.id),
            user ? supabase.from('likes').select('*').eq('post_id', p.id).eq('user_id', user.id).single() : Promise.resolve({ data: null }),
            user ? supabase.from('saved_posts').select('*').eq('post_id', p.id).eq('user_id', user.id).single() : Promise.resolve({ data: null }),
          ])

        return {
          ...p,
          user: userProfile || { id: p.user_id, username: 'creator', display_name: 'Creator', avatar_url: null },
          media: mediaRows || [],
          likesCount: likesCount || 0,
          commentsCount: commentsCount || 0,
          isLiked: !!userLike,
          isSaved: !!userSaved,
        }
      })
    )
  }

  // Fetch trending posts
  const { data: rawTrending } = await supabase.rpc('get_trending_posts', {
    p_viewer_id: user?.id ?? undefined,
    p_limit: 4,
  })

  let trendingPosts: any[] = []
  if (rawTrending && rawTrending.length > 0) {
    trendingPosts = await Promise.all(
      (rawTrending as any[]).map(async (p) => {
        const [{ data: userProfile }, { data: mediaRows }, { count: likesCount }, { count: commentsCount }] =
          await Promise.all([
            supabase.from('profiles').select('id, username, display_name, avatar_url').eq('id', p.user_id).single(),
            supabase.from('post_media').select('id, media_url, media_type, position').eq('post_id', p.id).order('position', { ascending: true }),
            supabase.from('likes').select('*', { count: 'exact', head: true }).eq('post_id', p.id),
            supabase.from('comments').select('*', { count: 'exact', head: true }).eq('post_id', p.id),
          ])

        return {
          ...p,
          user: userProfile || { id: p.user_id, username: 'creator', display_name: 'Creator', avatar_url: null },
          media: mediaRows || [],
          likesCount: likesCount || 0,
          commentsCount: commentsCount || 0,
        }
      })
    )
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/10 relative overflow-hidden shadow-2xl flex items-center justify-between">
        <div className="space-y-2 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/30 text-fuchsia-400 text-xs font-semibold">
            <Compass className="w-3.5 h-3.5" /> Explore Discovery
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Discover What&apos;s <span className="gradient-text">Trending</span>
          </h1>
          <p className="text-xs text-slate-400 max-w-md">
            Explore photos, moments, and popular creators across the Zeloria network.
          </p>
        </div>
        <div className="hidden md:block p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
          <Sparkles className="w-12 h-12 text-fuchsia-400" />
        </div>
      </div>

      {/* Trending Spotlight Carousel */}
      {trendingPosts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <TrendingUp className="w-4 h-4 text-fuchsia-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Trending Spotlight
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {trendingPosts.map((tp) => (
              <div
                key={tp.id}
                className="group relative aspect-square rounded-2xl overflow-hidden glass-card border border-white/10 shadow-lg cursor-pointer"
              >
                {tp.media[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={tp.media[0].media_url}
                    alt={tp.caption || 'Trending Post'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
                  <p className="text-xs font-bold text-white truncate">@{tp.user.username}</p>
                  <p className="text-[10px] text-fuchsia-300 font-semibold">{tp.likesCount} likes</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Explore Grid */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 px-1">
          Community Stream
        </h2>
        <ExploreGrid posts={posts} currentUserId={user?.id} />
      </div>
    </div>
  )
}
