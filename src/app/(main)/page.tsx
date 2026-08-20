import React from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PostCard } from '@/components/posts/PostCard'
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

  let posts: any[] = []

  if (user) {
    // 1. Get list of user IDs that current user follows
    const { data: followRows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)

    const followingIds = (followRows || []).map((f) => f.following_id)
    const allowedUserIds = [user.id, ...followingIds]

    // 2. Query posts from allowed users
    const { data: fetchedPosts } = await supabase
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
      .in('user_id', allowedUserIds)
      .order('created_at', { ascending: false })

    if (fetchedPosts) {
      posts = await Promise.all(
        fetchedPosts.map(async (p: any) => {
          const sortedMedia = (p.media || []).sort((a: any, b: any) => a.position - b.position)
          const [{ count: likesCount }, { count: commentsCount }, { data: userLike }, { data: userSaved }] =
            await Promise.all([
              supabase.from('likes').select('*', { count: 'exact', head: true }).eq('post_id', p.id),
              supabase.from('comments').select('*', { count: 'exact', head: true }).eq('post_id', p.id),
              supabase.from('likes').select('*').eq('post_id', p.id).eq('user_id', user.id).single(),
              supabase.from('saved_posts').select('*').eq('post_id', p.id).eq('user_id', user.id).single(),
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
    <div className="space-y-6 max-w-xl mx-auto">
      {posts.length === 0 ? (
        <div className="glass-card rounded-3xl p-8 sm:p-12 text-center space-y-4 border border-white/10 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 p-0.5 mx-auto shadow-lg">
            <div className="w-full h-full rounded-[14px] bg-slate-900 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-pink-400 animate-pulse" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-white">Your Feed is Ready!</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            No posts in your feed yet. Publish your first photo or follow creators to see their posts here.
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
        <div className="space-y-6">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} currentUserId={user?.id} />
          ))}
        </div>
      )}
    </div>
  )
}
