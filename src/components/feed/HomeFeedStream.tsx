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

  // Fetcher function calling get_home_feed RPC
  const fetchMorePosts = useCallback(
    async (cursorCreatedAt?: string, cursorId?: string) => {
      const { data: rawPosts, error } = await supabase.rpc('get_home_feed', {
        p_user_id: currentUserId,
        p_limit: 5,
        p_cursor_created_at: cursorCreatedAt ?? undefined,
        p_cursor_id: cursorId ?? undefined,
      })

      if (error || !rawPosts || rawPosts.length === 0) {
        return { posts: [], hasMore: false }
      }

      // Enrich fetched posts with media, like/comment counts & user like state
      const enriched = await Promise.all(
        (rawPosts as any[]).map(async (p) => {
          const [{ data: userProfile }, { data: mediaRows }, { count: likesCount }, { count: commentsCount }, { data: userLike }, { data: userSaved }] =
            await Promise.all([
              supabase.from('profiles').select('id, username, display_name, avatar_url').eq('id', p.user_id).single(),
              supabase.from('post_media').select('id, media_url, media_type, position').eq('post_id', p.id).order('position', { ascending: true }),
              supabase.from('likes').select('*', { count: 'exact', head: true }).eq('post_id', p.id),
              supabase.from('comments').select('*', { count: 'exact', head: true }).eq('post_id', p.id),
              supabase.from('likes').select('*').eq('post_id', p.id).eq('user_id', currentUserId).single(),
              supabase.from('saved_posts').select('*').eq('post_id', p.id).eq('user_id', currentUserId).single(),
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

      return {
        posts: enriched as any[],
        hasMore: rawPosts.length === 5,
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

      {/* Infinite Scroll Trigger & Spinner */}
      <div ref={observerTargetRef} className="py-6 text-center">
        {loading ? (
          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-pink-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading more posts...
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
