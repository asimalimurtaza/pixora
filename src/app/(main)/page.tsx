import React from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { HomeFeedStream } from '@/components/feed/HomeFeedStream'
import { StoryRingRow } from '@/components/stories/StoryRingRow'
import { Sparkles, PlusSquare, Compass } from 'lucide-react'

export const metadata = {
  title: 'Home Feed • Pixora',
  description: 'Chronological social feed of creators you follow.',
}

export default async function HomePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let initialPosts: any[] = []
  let initialHasMore = false

  if (user) {
    // Call get_home_feed RPC
    const { data: rawPosts } = await supabase.rpc('get_home_feed', {
      p_user_id: user.id,
      p_limit: 5,
    })

    if (rawPosts && rawPosts.length > 0) {
      initialHasMore = rawPosts.length === 5

      initialPosts = await Promise.all(
        (rawPosts as any[]).map(async (p) => {
          const [{ data: userProfile }, { data: mediaRows }, { count: likesCount }, { count: commentsCount }, { data: userLike }, { data: userSaved }] =
            await Promise.all([
              supabase.from('profiles').select('id, username, display_name, avatar_url').eq('id', p.user_id).single(),
              supabase.from('post_media').select('id, media_url, media_type, position').eq('post_id', p.id).order('position', { ascending: true }),
              supabase.from('likes').select('*', { count: 'exact', head: true }).eq('post_id', p.id),
              supabase.from('comments').select('*', { count: 'exact', head: true }).eq('post_id', p.id),
              supabase.from('likes').select('*').eq('post_id', p.id).eq('user_id', user.id).single(),
              supabase.from('saved_posts').select('*').eq('post_id', p.id).eq('user_id', user.id).single(),
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
    }
  }

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      {/* Live Stories Ring Tray */}
      <StoryRingRow currentUserId={user?.id} />

      {/* Main Feed Stream */}
      {initialPosts.length === 0 ? (
        <div className="glass-card rounded-3xl p-8 sm:p-12 text-center space-y-4 border border-white/10 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 p-0.5 mx-auto shadow-lg">
            <div className="w-full h-full rounded-[14px] bg-slate-900 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-pink-400 animate-pulse" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-white">Your Feed is Empty</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            You are not following any creators yet or they haven&apos;t posted photos. Share your own photo or discover creators on Pixora!
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/create"
              className="px-5 py-2.5 rounded-xl gradient-btn text-white text-xs font-semibold flex items-center gap-2 shadow-md"
            >
              <PlusSquare className="w-4 h-4" /> Create First Post
            </Link>
            <Link
              href="/explore"
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-all"
            >
              <Compass className="w-4 h-4 text-purple-400" /> Explore Creators
            </Link>
          </div>
        </div>
      ) : (
        <HomeFeedStream
          initialPosts={initialPosts as any}
          initialHasMore={initialHasMore}
          currentUserId={user?.id || ''}
        />
      )}
    </div>
  )
}
