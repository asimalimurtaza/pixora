import React from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { UserCheck, Link as LinkIcon, Settings, Grid, Bookmark, Shield } from 'lucide-react'

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

  // Get Current Authenticated User
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()

  // Fetch Target Profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single()

  if (!profile) {
    notFound()
  }

  const isOwnProfile = currentUser?.id === profile.id

  // Fetch Counts
  const [{ count: postCount }, { count: followerCount }, { count: followingCount }] = await Promise.all([
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', profile.id),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', profile.id),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', profile.id),
  ])

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
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

          {/* Profile Metadata */}
          <div className="flex-1 text-center sm:text-left space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-white">{profile.display_name || profile.username}</h1>
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
                  <button className="px-5 py-2 rounded-xl gradient-btn text-white text-xs font-semibold flex items-center gap-2 shadow-md cursor-pointer">
                    <UserCheck className="w-4 h-4" />
                    Follow
                  </button>
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

      {/* Profile Content Tabs */}
      <div className="space-y-4">
        <div className="flex justify-center border-b border-slate-800 gap-8 text-xs font-semibold">
          <button className="flex items-center gap-2 py-3 border-b-2 border-pink-500 text-pink-400">
            <Grid className="w-4 h-4" /> POSTS
          </button>
          {isOwnProfile && (
            <button className="flex items-center gap-2 py-3 text-slate-400 hover:text-white transition-colors">
              <Bookmark className="w-4 h-4" /> SAVED
            </button>
          )}
        </div>

        {/* Empty Post Grid */}
        <div className="glass-card rounded-2xl p-12 text-center space-y-3 border border-white/10">
          <Shield className="w-8 h-8 text-slate-500 mx-auto" />
          <h3 className="text-sm font-bold text-white">No Posts Yet</h3>
          <p className="text-xs text-slate-400">
            When {isOwnProfile ? 'you' : `@${profile.username}`} post photos or carousels, they will appear here.
          </p>
        </div>
      </div>
    </div>
  )
}
