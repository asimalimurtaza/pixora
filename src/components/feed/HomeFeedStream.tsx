'use client'

import React, { useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useInfiniteFeed } from '@/hooks/useInfiniteFeed'
import { PostCard, PostCardData } from '@/components/posts/PostCard'
import { Loader2, CheckCircle2 } from 'lucide-react'

interface HomeFeedStreamProps {
  initialPosts: PostCardData[]
  initialHasMore: boolean
  currentUserId: string
}

export function HomeFeedStream({
  initialPosts,
  initialHasMore,
  currentUserId,
}: HomeFeedStreamProps) {
  const supabase = createClient()

  // Fetcher function calling single-query get_home_feed_v2 RPC (0 N+1 roundtrips)
  const fetchMorePosts = useCallback(
    async (cursorCreatedAt?: string) => {
      const { data: rawPosts, error } = await supabase.rpc('get_home_feed_v2', {
        p_user_id: currentUserId,
        p_limit: 6,
        p_cursor: cursorCreatedAt ?? undefined,
      })

      if (error || !rawPosts || !Array.isArray(rawPosts) || rawPosts.length === 0) {
        return { posts: [], hasMore: false }
      }

      return {
        posts: rawPosts as any[],
        hasMore: rawPosts.length === 6,
      }
    },
    [supabase, currentUserId]
  )

  const { posts, setPosts, hasMore, loading, observerTargetRef } = useInfiniteFeed(
    fetchMorePosts,
    initialPosts,
    initialHasMore
  )

  const handlePostDeleted = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId))
  }

  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          currentUserId={currentUserId}
          onPostDeleted={handlePostDeleted}
        />
      ))}

      {/* Infinite Scroll Trigger & End of Feed State */}
      <div ref={observerTargetRef} className="py-6 text-center">
        {loading ? (
          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-sky-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading more moments...
          </div>
        ) : !hasMore && posts.length > 0 ? (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card border border-white/10 text-xs font-semibold text-slate-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            You&apos;re all caught up for today!
          </div>
        ) : null}
      </div>
    </div>
  )
}
