import React from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { HomeFeedStream } from '@/components/feed/HomeFeedStream'
import { StoryRingRow } from '@/components/stories/StoryRingRow'
import { Sparkles, PlusSquare, Compass } from 'lucide-react'

export const metadata = {
  title: 'Pixora • Your Visual Stream',
  description: 'Chronological personal feed of creators and moments.',
}

export default async function HomePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let initialPosts: any[] = []
  let initialHasMore = false

  if (user) {
    // Single-query RPC call (0 N+1 roundtrips)
    const { data: feedData } = await supabase.rpc('get_home_feed_v2', {
      p_user_id: user.id,
      p_limit: 6,
    })

    if (feedData && Array.isArray(feedData) && feedData.length > 0) {
      initialPosts = feedData
      initialHasMore = feedData.length === 6
    }
  }

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      {/* Live Stories Ring Tray */}
      <StoryRingRow currentUserId={user?.id} />

      {/* Main Stream */}
      {initialPosts.length === 0 ? (
        <div className="glass-card rounded-3xl p-8 sm:p-12 text-center space-y-4 border border-white/10 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl border border-indigo-500/40 bg-indigo-500/10 p-0.5 mx-auto shadow-sm flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-sky-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Your Stream is Forming</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            You are not following any creators yet or they haven&apos;t shared photos recently. Discover creators or create your first post on Pixora!
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/create"
              className="px-5 py-2.5 rounded-xl gradient-btn text-white text-xs font-semibold flex items-center gap-2 shadow-md cursor-pointer"
            >
              <PlusSquare className="w-4 h-4" /> Create First Post
            </Link>
            <Link
              href="/explore"
              className="px-5 py-2.5 rounded-xl border border-indigo-500/40 bg-indigo-500/10 hover:bg-indigo-500/20 text-sky-300 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
            >
              <Compass className="w-4 h-4 text-sky-400" /> Explore Creators
            </Link>
          </div>
        </div>
      ) : (
        <HomeFeedStream
          initialPosts={initialPosts}
          initialHasMore={initialHasMore}
          currentUserId={user?.id || ''}
        />
      )}
    </div>
  )
}
