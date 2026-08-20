import React from 'react'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PostCard } from '@/components/posts/PostCard'
import { Lock } from 'lucide-react'

interface DirectPostPageProps {
  params: Promise<{
    postId: string
  }>
}

export async function generateMetadata({ params }: DirectPostPageProps) {
  const { postId } = await params
  return {
    title: `Post • Pixora`,
    description: `View post ${postId} on Pixora.`,
  }
}

export default async function DirectPostPage({ params }: DirectPostPageProps) {
  const { postId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Query post with author and media under RLS
  const { data: p, error } = await supabase
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
    .eq('id', postId)
    .single()

  if (error || !p) {
    // If post is not found or unauthorized via RLS, return safe 404
    notFound()
  }

  const sortedMedia = (p.media || []).sort((a: any, b: any) => a.position - b.position)
  const [{ count: likesCount }, { count: commentsCount }, { data: userLike }, { data: userSaved }] =
    await Promise.all([
      supabase.from('likes').select('*', { count: 'exact', head: true }).eq('post_id', p.id),
      supabase.from('comments').select('*', { count: 'exact', head: true }).eq('post_id', p.id),
      user
        ? supabase.from('likes').select('*').eq('post_id', p.id).eq('user_id', user.id).single()
        : Promise.resolve({ data: null }),
      user
        ? supabase.from('saved_posts').select('*').eq('post_id', p.id).eq('user_id', user.id).single()
        : Promise.resolve({ data: null }),
    ])

  const fullPost = {
    ...p,
    media: sortedMedia,
    likesCount: likesCount || 0,
    commentsCount: commentsCount || 0,
    isLiked: !!userLike,
    isSaved: !!userSaved,
  }

  return (
    <div className="max-w-xl mx-auto py-4">
      <PostCard post={fullPost as any} currentUserId={user?.id} />
    </div>
  )
}
