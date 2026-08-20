'use client'

import React, { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { uploadMediaFile } from '@/lib/supabase/storage'
import { useToast } from '@/components/ui/Toast'
import { X, Upload, Loader2, Sparkles } from 'lucide-react'

interface CreateStoryModalProps {
  onClose: () => void
  onStoryCreated: () => void
}

export function CreateStoryModal({ onClose, onStoryCreated }: CreateStoryModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [publishing, setPublishing] = useState(false)

  const { showToast } = useToast()
  const supabase = createClient()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = e.target.files[0]
      setFile(selected)
      setPreviewUrl(URL.createObjectURL(selected))
    }
  }

  const handlePublish = async () => {
    if (!file || publishing) return

    setPublishing(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        showToast('Please log in to publish a story', 'error')
        return
      }

      // Upload image to story-media bucket under user.id folder
      const uploadRes = await uploadMediaFile(file, 'story-media')

      // Insert story metadata into PostgreSQL
      const { error } = await supabase.from('stories').insert({
        user_id: user.id,
        media_url: uploadRes.url,
        media_path: uploadRes.path,
        media_type: 'image',
        caption: caption.trim() || null,
        // expires_at is automatically defaulted by PostgreSQL trigger to NOW() + 24 HOURS
      })

      if (error) {
        showToast(error.message, 'error')
      } else {
        showToast('Story published for 24 hours!', 'success')
        onStoryCreated()
        onClose()
      }
    } catch (err: any) {
      showToast(err.message || 'Story publication failed', 'error')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="glass-card w-full max-w-md rounded-3xl p-6 border border-white/10 shadow-2xl space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-pink-400" />
            Add to Story
          </h2>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Media Upload Box / Preview */}
        {!previewUrl ? (
          <label className="flex flex-col items-center justify-center h-64 rounded-2xl border-2 border-dashed border-slate-700 bg-slate-900/50 hover:bg-slate-900 transition-colors cursor-pointer space-y-3">
            <div className="p-3 rounded-full bg-pink-500/10 text-pink-400">
              <Upload className="w-6 h-6" />
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold text-white">Select a photo for your story</p>
              <p className="text-[10px] text-slate-400 mt-0.5">JPG, PNG or WEBP up to 10MB</p>
            </div>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        ) : (
          <div className="space-y-4">
            <div className="relative h-72 rounded-2xl overflow-hidden bg-black border border-slate-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="Story Preview" className="w-full h-full object-cover" />
              <button
                onClick={() => {
                  setFile(null)
                  setPreviewUrl(null)
                }}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 text-white hover:bg-black"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add an optional caption..."
              className="w-full px-4 py-2.5 rounded-xl glass-input text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handlePublish}
            disabled={!file || publishing}
            className="flex-1 py-2.5 rounded-xl gradient-btn text-white text-xs font-semibold shadow-lg disabled:opacity-40"
          >
            {publishing ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Share Story'}
          </button>
        </div>
      </div>
    </div>
  )
}
