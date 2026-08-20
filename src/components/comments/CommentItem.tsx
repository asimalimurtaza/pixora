'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { CornerDownRight, Trash2, Edit2, Check, X, Loader2 } from 'lucide-react'

export interface CommentData {
  id: string
  post_id: string
  user_id: string
  parent_id: string | null
  content: string
  created_at: string
  user: {
    id: string
    username: string
    display_name: string | null
    avatar_url: string | null
  }
  replies?: CommentData[]
}

interface CommentItemProps {
  comment: CommentData
  currentUserId?: string
  onReply: (parentComment: CommentData) => void
  onCommentDeleted: (commentId: string) => void
  onCommentUpdated: (commentId: string, newContent: string) => void
}

export function CommentItem({
  comment,
  currentUserId,
  onReply,
  onCommentDeleted,
  onCommentUpdated,
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(comment.content)
  const [loading, setLoading] = useState(false)

  const { showToast } = useToast()
  const supabase = createClient()
  const isOwner = currentUserId === comment.user_id

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this comment?')) return
    setLoading(true)
    try {
      const { error } = await supabase.from('comments').delete().eq('id', comment.id)
      if (error) {
        showToast(error.message, 'error')
      } else {
        onCommentDeleted(comment.id)
        showToast('Comment deleted', 'info')
      }
    } catch (err: any) {
      showToast(err.message || 'Delete failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async () => {
    if (!editContent.trim()) return
    setLoading(true)
    try {
      const { error } = await supabase
        .from('comments')
        .update({ content: editContent.trim() })
        .eq('id', comment.id)

      if (error) {
        showToast(error.message, 'error')
      } else {
        onCommentUpdated(comment.id, editContent.trim())
        setIsEditing(false)
        showToast('Comment updated', 'success')
      }
    } catch (err: any) {
      showToast(err.message || 'Update failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3 group">
        {/* Avatar */}
        <Link href={`/profile/${comment.user.username}`} className="shrink-0 mt-0.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 p-0.5">
            <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center font-bold text-[10px] text-white overflow-hidden">
              {comment.user.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={comment.user.avatar_url}
                  alt={comment.user.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                comment.user.display_name?.[0]?.toUpperCase() || comment.user.username[0]?.toUpperCase()
              )}
            </div>
          </div>
        </Link>

        {/* Content Box */}
        <div className="flex-1 min-w-0">
          <div className="p-3 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <Link
                href={`/profile/${comment.user.username}`}
                className="text-xs font-bold text-white hover:text-pink-400 transition-colors truncate"
              >
                {comment.user.display_name || comment.user.username}
                <span className="text-[10px] text-slate-400 font-normal ml-1">
                  @{comment.user.username}
                </span>
              </Link>

              <span className="text-[10px] text-slate-500 shrink-0">
                {new Date(comment.created_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>

            {isEditing ? (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-xl glass-input text-xs focus:outline-none"
                />
                <button
                  onClick={handleUpdate}
                  disabled={loading}
                  className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 cursor-pointer"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-200 break-words">{comment.content}</p>
            )}
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-4 px-2 pt-1 text-[11px] text-slate-400 font-medium">
            <button
              onClick={() => onReply(comment)}
              className="flex items-center gap-1 hover:text-pink-400 transition-colors cursor-pointer"
            >
              <CornerDownRight className="w-3 h-3" /> Reply
            </button>

            {isOwner && !isEditing && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="hover:text-purple-400 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Edit2 className="w-3 h-3" /> Edit
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="hover:text-rose-400 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Nested Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="pl-8 space-y-2 border-l-2 border-slate-800/80 ml-4 pt-1">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              onReply={onReply}
              onCommentDeleted={onCommentDeleted}
              onCommentUpdated={onCommentUpdated}
            />
          ))}
        </div>
      )}
    </div>
  )
}
