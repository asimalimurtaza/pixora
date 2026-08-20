'use client'

import React, { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { Message } from '@/types/database'
import { Edit2, Trash2, Check, X, Loader2, Ban } from 'lucide-react'

interface MessageBubbleProps {
  message: Message
  currentUserId: string
  partnerAvatar?: string | null
  partnerUsername?: string
  onMessageUpdated?: (id: string, newContent: string) => void
  onMessageDeleted?: (id: string) => void
}

export function MessageBubble({
  message,
  currentUserId,
  partnerAvatar,
  partnerUsername,
  onMessageUpdated,
  onMessageDeleted,
}: MessageBubbleProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content || '')
  const [loading, setLoading] = useState(false)

  const { showToast } = useToast()
  const supabase = createClient()
  const isSelf = message.sender_id === currentUserId
  const isDeleted = !!message.deleted_at
  const isEdited = !!message.edited_at && !isDeleted

  const handleEdit = async () => {
    if (!editContent.trim()) return
    setLoading(true)
    try {
      const { error } = await supabase
        .from('messages')
        .update({
          content: editContent.trim(),
          edited_at: new Date().toISOString(),
        })
        .eq('id', message.id)

      if (error) {
        showToast(error.message, 'error')
      } else {
        onMessageUpdated?.(message.id, editContent.trim())
        setIsEditing(false)
        showToast('Message edited', 'success')
      }
    } catch (err: any) {
      showToast(err.message || 'Edit failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this message for everyone?')) return
    setLoading(true)
    try {
      const { error } = await supabase
        .from('messages')
        .update({
          deleted_at: new Date().toISOString(),
          content: null,
          attachment_url: null,
        })
        .eq('id', message.id)

      if (error) {
        showToast(error.message, 'error')
      } else {
        onMessageDeleted?.(message.id)
        showToast('Message deleted', 'info')
      }
    } catch (err: any) {
      showToast(err.message || 'Delete failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`flex items-end gap-2 group ${isSelf ? 'justify-end' : 'justify-start'}`}>
      {/* Partner Avatar for incoming messages */}
      {!isSelf && (
        <div className="w-7 h-7 rounded-full bg-slate-800 shrink-0 mb-1 overflow-hidden font-bold text-[10px] flex items-center justify-center text-white border border-slate-700">
          {partnerAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={partnerAvatar} alt="Partner" className="w-full h-full object-cover" />
          ) : (
            partnerUsername?.[0]?.toUpperCase() || 'P'
          )}
        </div>
      )}

      <div className={`max-w-[75%] space-y-1 ${isSelf ? 'items-end' : 'items-start'}`}>
        {/* Soft Deleted State */}
        {isDeleted ? (
          <div className="px-4 py-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs italic text-slate-500 flex items-center gap-2">
            <Ban className="w-3.5 h-3.5" /> This message was deleted.
          </div>
        ) : (
          <div
            className={`p-3.5 rounded-2xl text-xs shadow-md space-y-2 relative transition-all ${
              isSelf
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-br-none'
                : 'bg-slate-800/90 border border-slate-700/80 text-slate-100 rounded-bl-none'
            }`}
          >
            {/* Image Attachment */}
            {message.attachment_url && (
              <div className="rounded-xl overflow-hidden max-w-xs max-h-60 bg-black/40 border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={message.attachment_url}
                  alt="Attachment"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Editing Box vs Text Content */}
            {isEditing ? (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-xl bg-black/40 border border-white/20 text-xs text-white focus:outline-none"
                />
                <button
                  onClick={handleEdit}
                  disabled={loading}
                  className="p-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 cursor-pointer"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="p-1.5 rounded-lg bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              message.content && <p className="break-words leading-relaxed">{message.content}</p>
            )}

            {/* Timestamp & Edited Indicator */}
            <div className="flex items-center justify-end gap-1.5 text-[9px] opacity-70 pt-0.5">
              {isEdited && <span>(edited)</span>}
              <span>
                {new Date(message.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
        )}

        {/* Hover Action Controls (Self only) */}
        {isSelf && !isDeleted && !isEditing && (
          <div className="flex items-center justify-end gap-2 px-1 text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setIsEditing(true)}
              className="hover:text-purple-300 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Edit2 className="w-3 h-3" /> Edit
            </button>
            <button
              onClick={handleDelete}
              className="hover:text-rose-400 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" /> Delete
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
