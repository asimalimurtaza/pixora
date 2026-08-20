'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { PostCarousel } from './PostCarousel'
import { LikeButton } from './LikeButton'
import { SaveButton } from './SaveButton'
import { CommentSection } from '@/components/comments/CommentSection'
import { MessageCircle, Share2, MoreHorizontal, Trash2, Globe, Users, Lock } from 'lucide-react'

export interface PostCardData {
  id: string
  user_id: string
  caption: string | null
  visibility: 'public' | 'followers_only' | 'private'
  created_at: string
  user: {
    id: string
    username: string
    display_name: string | null
    avatar_url: string | null
  }
  media: {
    id: string
    media_url: string
    media_type: string
    position: number
  }[]
  likesCount?: number
  commentsCount?: number
  isLiked?: boolean
  isSaved?: boolean
}

interface PostCardProps {
  post: PostCardData
  currentUserId?: string
  onPostDeleted?: (postId: string) => void
}

export function PostCard({ post, currentUserId, onPostDeleted }: PostCardProps) {
  const [showComments, setShowComments] = useState(false)
  const [commentCount, setCommentCount] = useState(post.commentsCount || 0)
  const [showMenu, setShowMenu] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [expandedCaption, setExpandedCaption] = useState(false)

  const router = useRouter()
  const { showToast } = useToast()
  const supabase = createClient()

  const isOwner = currentUserId === post.user_id

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation()
    const url = `${window.location.origin}/post/${post.id}`
    navigator.clipboard.writeText(url)
    showToast('Post link copied to clipboard!', 'success')
  }

  const handleDeletePost = async () => {
    if (!confirm('Are you sure you want to delete this post?')) return

    setIsDeleting(true)
    try {
      const { error } = await supabase.from('posts').delete().eq('id', post.id)
      if (error) {
        showToast(error.message, 'error')
      } else {
        showToast('Post deleted successfully', 'info')
        onPostDeleted?.(post.id)
        router.refresh()
      }
    } catch (err: any) {
      showToast(err.message || 'Delete post failed', 'error')
    } finally {
      setIsDeleting(false)
    }
  }

  const captionText = post.caption || ''
  const isCaptionLong = captionText.length > 120

  return (
    <article className="glass-card rounded-3xl overflow-hidden border border-white/10 shadow-2xl transition-all">
      {/* Author Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800/60">
        <Link href={`/profile/${post.user.username}`} className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-500 via-purple-600 to-blue-500 p-0.5 shrink-0">
            <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center font-bold text-xs text-white overflow-hidden">
              {post.user.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.user.avatar_url}
                  alt={post.user.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                post.user.display_name?.[0]?.toUpperCase() || post.user.username[0]?.toUpperCase()
              )}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-white hover:text-pink-400 transition-colors">
                {post.user.display_name || post.user.username}
              </h3>
              {post.visibility === 'public' && <span title="Public"><Globe className="w-3 h-3 text-slate-400" /></span>}
              {post.visibility === 'followers_only' && <span title="Followers only"><Users className="w-3 h-3 text-purple-400" /></span>}
              {post.visibility === 'private' && <span title="Private"><Lock className="w-3 h-3 text-amber-400" /></span>}
            </div>
            <p className="text-[10px] text-slate-400">
              @{post.user.username} • {new Date(post.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </p>
          </div>
        </Link>

        {/* Options Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all cursor-pointer"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-10 w-44 rounded-2xl bg-slate-900 border border-slate-700/80 p-2 shadow-2xl z-30 space-y-1">
              <button
                onClick={handleCopyLink}
                className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-slate-200 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-sky-400" />
                Copy Link
              </button>
              {isOwner && (
                <button
                  onClick={handleDeletePost}
                  disabled={isDeleting}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Post
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Post Media Carousel */}
      <PostCarousel mediaItems={post.media} />

      {/* Post Actions Bar */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LikeButton
              postId={post.id}
              initialLiked={!!post.isLiked}
              initialCount={post.likesCount || 0}
            />

            <button
              onClick={() => setShowComments(!showComments)}
              className="flex items-center gap-1.5 p-2 rounded-full text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all cursor-pointer"
            >
              <MessageCircle className="w-6 h-6" />
              <span className="text-xs font-bold text-slate-200">{commentCount}</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="p-2 rounded-full text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all cursor-pointer"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>

          <SaveButton postId={post.id} initialSaved={!!post.isSaved} />
        </div>

        {/* Caption */}
        {captionText && (
          <div className="text-xs text-slate-200 space-y-1">
            <p>
              <Link href={`/profile/${post.user.username}`} className="font-bold text-white mr-2 hover:text-pink-400">
                @{post.user.username}
              </Link>
              {isCaptionLong && !expandedCaption ? (
                <>
                  {captionText.slice(0, 120)}...{' '}
                  <button
                    onClick={() => setExpandedCaption(true)}
                    className="font-semibold text-slate-400 hover:text-white"
                  >
                    more
                  </button>
                </>
              ) : (
                captionText
              )}
            </p>
          </div>
        )}

        {/* Comments Toggle Bar */}
        {commentCount > 0 && !showComments && (
          <button
            onClick={() => setShowComments(true)}
            className="text-xs font-medium text-slate-400 hover:text-pink-400 transition-colors pt-1"
          >
            View all {commentCount} comments
          </button>
        )}

        {/* Expandable Comment Section */}
        {showComments && (
          <CommentSection
            postId={post.id}
            currentUserId={currentUserId}
            onCommentCountChange={(delta) => setCommentCount((prev) => Math.max(0, prev + delta))}
          />
        )}
      </div>
    </article>
  )
}
