import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { ProfilePostGrid } from '@/components/posts/ProfilePostGrid'
import { Bookmark } from 'lucide-react'

export const metadata = { title: 'Saved Posts • Pixora' }

export default async function SavedPostsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let savedPosts: any[] = []

  if (user) {
    const { data: rows } = await supabase
      .from('saved_posts')
      .select(`
        post:posts(
          id,
          user_id,
          caption,
          visibility,
          created_at,
          user:profiles!posts_user_id_fkey(id, username, display_name, avatar_url),
          media:post_media(id, media_url, media_type, position)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (rows) {
      const rawPosts = rows.map((r: any) => r.post).filter(Boolean)

      savedPosts = await Promise.all(
        rawPosts.map(async (p: any) => {
          const sortedMedia = (p.media || []).sort((a: any, b: any) => a.position - b.position)
          const [{ count: likesCount }, { count: commentsCount }, { data: userLike }] =
            await Promise.all([
              supabase.from('likes').select('*', { count: 'exact', head: true }).eq('post_id', p.id),
              supabase.from('comments').select('*', { count: 'exact', head: true }).eq('post_id', p.id),
              supabase.from('likes').select('*').eq('post_id', p.id).eq('user_id', user.id).single(),
            ])

          return {
            ...p,
            media: sortedMedia,
            likesCount: likesCount || 0,
            commentsCount: commentsCount || 0,
            isLiked: !!userLike,
            isSaved: true,
          }
        })
      )
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Bookmark className="w-6 h-6 text-pink-500" />
        <h1 className="text-2xl font-bold text-white">Saved Posts</h1>
      </div>

      {savedPosts.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center space-y-3 border border-white/10 shadow-xl">
          <Bookmark className="w-10 h-10 text-slate-500 mx-auto" />
          <h2 className="text-lg font-bold text-white">No Saved Posts Yet</h2>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Save photos and carousels you love by tapping the bookmark icon on posts.
          </p>
        </div>
      ) : (
        <ProfilePostGrid posts={savedPosts} currentUserId={user?.id} />
      )}
    </div>
  )
}
