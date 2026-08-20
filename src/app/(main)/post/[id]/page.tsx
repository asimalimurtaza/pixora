import React from 'react'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PostCard } from '@/components/posts/PostCard'

interface SinglePostPageProps {
  params: Promise<{
    id: string
  }>
}

export async function generateMetadata({ params }: SinglePostPageProps) {
  const { id } = await params
  return {
    title: `Post ${id.slice(0, 8)} • Pixora`,
  }
}

export default async function SinglePostPage({ params }: SinglePostPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: p } = await supabase
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
    .eq('id', id)
    .single()

  if (!p) {
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
