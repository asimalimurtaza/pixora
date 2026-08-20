'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { CommentItem, CommentData } from './CommentItem'
import { Send, X, Loader2, MessageSquare } from 'lucide-react'

interface CommentSectionProps {
  postId: string
  currentUserId?: string
  onCommentCountChange?: (delta: number) => void
}

const COMMENTS_PER_PAGE = 10

export function CommentSection({
  postId,
  currentUserId,
  onCommentCountChange,
}: CommentSectionProps) {
  const [comments, setComments] = useState<CommentData[]>([])
  const [newComment, setNewComment] = useState('')
  const [replyTarget, setReplyTarget] = useState<CommentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(0)

  const { showToast } = useToast()
  const supabase = createClient()

  const fetchComments = useCallback(
    async (pageIndex: number) => {
      try {
        const from = pageIndex * COMMENTS_PER_PAGE
        const to = from + COMMENTS_PER_PAGE - 1

        const { data, count, error } = await supabase
          .from('comments')
          .select(
            'id, post_id, user_id, parent_id, content, created_at, user:profiles!comments_user_id_fkey(id, username, display_name, avatar_url)',
            { count: 'exact' }
          )
          .eq('post_id', postId)
          .order('created_at', { ascending: true })
          .range(from, to)

        if (error) {
          console.error('Error loading comments:', error)
          return
        }

        if (data) {
          const rawComments = data as any[]
          
          if (pageIndex === 0) {
            setComments(rawComments)
          } else {
            setComments((prev) => [...prev, ...rawComments])
          }

          setHasMore((count || 0) > (pageIndex + 1) * COMMENTS_PER_PAGE)
        }
      } catch (err) {
        console.error('Fetch comments error:', err)
      } finally {
        setLoading(false)
      }
    },
    [supabase, postId]
  )

  useEffect(() => {
    fetchComments(0)
  }, [fetchComments])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    setSubmitting(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        showToast('Please log in to leave a comment', 'error')
        setSubmitting(false)
        return
      }

      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          parent_id: replyTarget ? replyTarget.id : null,
          content: newComment.trim(),
        })
        .select(
          'id, post_id, user_id, parent_id, content, created_at, user:profiles!comments_user_id_fkey(id, username, display_name, avatar_url)'
        )
        .single()

      if (error || !data) {
        showToast(error?.message || 'Failed to submit comment', 'error')
      } else {
        const created = data as any
        setComments((prev) => [...prev, created])
        setNewComment('')
        setReplyTarget(null)
        onCommentCountChange?.(1)
        showToast('Comment posted', 'success')
      }
    } catch (err: any) {
      showToast(err.message || 'Comment submission error', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCommentDeleted = (commentId: string) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId && c.parent_id !== commentId))
    onCommentCountChange?.(-1)
  }

  const handleCommentUpdated = (commentId: string, newContent: string) => {
    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, content: newContent } : c))
    )
  }

  // Tree Nesting Strategy for Parent & Reply Comments
  const parentComments = comments.filter((c) => !c.parent_id)
  const nestedTree = parentComments.map((parent) => ({
    ...parent,
    replies: comments.filter((c) => c.parent_id === parent.id),
  }))

  return (
    <div className="space-y-4 pt-3 border-t border-slate-800/80">
      {/* Comments List */}
      <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 text-pink-500 animate-spin" />
          </div>
        ) : nestedTree.length === 0 ? (
          <p className="text-center text-xs text-slate-500 py-4 flex items-center justify-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-slate-600" />
            No comments yet. Be the first to start the conversation!
          </p>
        ) : (
          nestedTree.map((item) => (
            <CommentItem
              key={item.id}
              comment={item}
              currentUserId={currentUserId}
              onReply={(parent) => setReplyTarget(parent)}
              onCommentDeleted={handleCommentDeleted}
              onCommentUpdated={handleCommentUpdated}
            />
          ))
        )}

        {hasMore && (
          <button
            onClick={() => {
              const nextPage = page + 1
              setPage(nextPage)
              fetchComments(nextPage)
            }}
            className="w-full text-center text-xs font-semibold text-pink-400 hover:underline py-2"
          >
            Load more comments...
          </button>
        )}
      </div>

      {/* Reply Banner */}
      {replyTarget && (
        <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-pink-500/10 border border-pink-500/30 text-xs">
          <span className="text-pink-300 truncate">
            Replying to <span className="font-bold">@{replyTarget.user.username}</span>
          </span>
          <button
            onClick={() => setReplyTarget(null)}
            className="text-pink-400 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={replyTarget ? `Reply to @${replyTarget.user.username}...` : 'Add a comment...'}
          className="flex-1 px-4 py-2.5 rounded-2xl glass-input text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/50"
        />
        <button
          type="submit"
          disabled={submitting || !newComment.trim()}
          className="p-2.5 rounded-2xl gradient-btn text-white disabled:opacity-40 cursor-pointer shadow-md"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
    </div>
  )
}
