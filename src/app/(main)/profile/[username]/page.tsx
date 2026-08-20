import React from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { FollowButton } from '@/components/profile/FollowButton'
import { ProfilePostGrid } from '@/components/posts/ProfilePostGrid'
import { Link as LinkIcon, Settings, Grid, Bookmark, Shield, Lock, BellRing } from 'lucide-react'

interface ProfilePageProps {
  params: Promise<{
    username: string
  }>
}

export async function generateMetadata({ params }: ProfilePageProps) {
  const { username } = await params
  return {
    title: `@${username} • Pixora Profile`,
    description: `View ${username}'s photos, stories, and posts on Pixora.`,
  }
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params
  const supabase = await createClient()

  // 1. Get Current Authenticated User
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()

  // 2. Fetch Profile Target
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single()

  if (!profile) {
    notFound()
  }

  const isOwnProfile = currentUser?.id === profile.id

  // 3. Determine Follow Status via get_follow_status RPC
  let followStatus: 'self' | 'following' | 'requested' | 'none' = 'none'
  if (currentUser) {
    if (isOwnProfile) {
      followStatus = 'self'
    } else {
      const { data: statusRes } = await supabase.rpc('get_follow_status', {
        p_viewer_id: currentUser.id,
        p_target_id: profile.id,
      })
      if (statusRes) {
        followStatus = statusRes as any
      }
    }
  }

  // 4. Fetch Stats Counts
  const [{ count: postCount }, { count: followerCount }, { count: followingCount }, { count: pendingRequestsCount }] =
    await Promise.all([
      supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', profile.id),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', profile.id),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', profile.id),
      isOwnProfile
        ? supabase.from('follow_requests').select('*', { count: 'exact', head: true }).eq('target_user_id', profile.id).eq('status', 'pending')
        : Promise.resolve({ count: 0 }),
    ])

  // 5. Determine Content Visibility
  const canViewContent = isOwnProfile || !profile.is_private || followStatus === 'following'

  // 6. Fetch User Posts with Media & Stats if authorized
  let posts: any[] = []
  if (canViewContent) {
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
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })

    if (fetchedPosts) {
      // Enrich with like & comment counts & current user likes/saved
      posts = await Promise.all(
        fetchedPosts.map(async (p: any) => {
          const sortedMedia = (p.media || []).sort((a: any, b: any) => a.position - b.position)
          const [{ count: likesCount }, { count: commentsCount }, { data: userLike }, { data: userSaved }] =
            await Promise.all([
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
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Pending Follow Requests Banner for Account Owner */}
      {isOwnProfile && (pendingRequestsCount || 0) > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 to-purple-500/20 border border-amber-500/40 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300">
              <BellRing className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Pending Follow Requests</p>
              <p className="text-[10px] text-slate-300">
                You have {pendingRequestsCount} account access request(s) waiting for approval.
              </p>
            </div>
          </div>
          <Link
            href="/notifications"
            className="px-3.5 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-colors"
          >
            Review
          </Link>
        </div>
      )}

      {/* Profile Header Card */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/10 relative overflow-hidden shadow-xl">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8">
          {/* Avatar */}
          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-tr from-pink-500 via-purple-600 to-blue-500 p-1 shrink-0 shadow-xl">
            <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center font-bold text-3xl text-white overflow-hidden">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt={profile.display_name || profile.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                profile.display_name?.[0]?.toUpperCase() || profile.username[0]?.toUpperCase() || 'P'
              )}
            </div>
          </div>

          {/* Profile Details */}
          <div className="flex-1 text-center sm:text-left space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <h1 className="text-2xl font-bold text-white">{profile.display_name || profile.username}</h1>
                  {profile.is_private && (
                    <span title="Private Account"><Lock className="w-4 h-4 text-amber-400" /></span>
                  )}
                </div>
                <p className="text-sm font-medium text-purple-400">@{profile.username}</p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {isOwnProfile ? (
                  <Link
                    href="/settings"
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    Edit Profile
                  </Link>
                ) : (
                  <FollowButton
                    targetUserId={profile.id}
                    isPrivate={profile.is_private}
                    initialStatus={followStatus}
                  />
                )}
              </div>
            </div>

            {/* Bio & Website */}
            {profile.bio && <p className="text-xs text-slate-300 max-w-xl">{profile.bio}</p>}
            {profile.website && (
              <a
                href={profile.website}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-pink-400 hover:underline"
              >
                <LinkIcon className="w-3.5 h-3.5" />
                {profile.website.replace(/^https?:\/\//, '')}
              </a>
            )}

            {/* Stats Row */}
            <div className="flex items-center justify-center sm:justify-start gap-6 pt-2 border-t border-slate-800/60 text-xs">
              <div>
                <span className="font-bold text-white text-sm">{postCount || 0}</span>{' '}
                <span className="text-slate-400">posts</span>
              </div>
              <div>
                <span className="font-bold text-white text-sm">{followerCount || 0}</span>{' '}
                <span className="text-slate-400">followers</span>
              </div>
              <div>
                <span className="font-bold text-white text-sm">{followingCount || 0}</span>{' '}
                <span className="text-slate-400">following</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {canViewContent ? (
        <div className="space-y-4">
          <div className="flex justify-center border-b border-slate-800 gap-8 text-xs font-semibold">
            <button className="flex items-center gap-2 py-3 border-b-2 border-pink-500 text-pink-400">
              <Grid className="w-4 h-4" /> POSTS
            </button>
            {isOwnProfile && (
              <Link href="/saved" className="flex items-center gap-2 py-3 text-slate-400 hover:text-white transition-colors">
                <Bookmark className="w-4 h-4" /> SAVED
              </Link>
            )}
          </div>

          {posts.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center space-y-3 border border-white/10">
              <Shield className="w-8 h-8 text-slate-500 mx-auto" />
              <h3 className="text-sm font-bold text-white">No Posts Yet</h3>
              <p className="text-xs text-slate-400">
                When {isOwnProfile ? 'you' : `@${profile.username}`} post photos or carousels, they will appear here.
              </p>
            </div>
          ) : (
            <ProfilePostGrid posts={posts} currentUserId={currentUser?.id} />
          )}
        </div>
      ) : (
        /* Private Account Lock Screen */
        <div className="glass-card rounded-3xl p-12 text-center space-y-4 border border-white/10">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-white">This Account is Private</h2>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Follow @{profile.username} to request permission to view their photos, carousels, and stories.
          </p>
        </div>
      )}
    </div>
  )
}
