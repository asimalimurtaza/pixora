'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { uploadMediaFile } from '@/lib/supabase/storage'
import { useToast } from '@/components/ui/Toast'
import {
  Upload,
  Image as ImageIcon,
  X,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Globe,
  Users,
  Lock,
  Sparkles,
} from 'lucide-react'

interface LocalMediaItem {
  id: string
  file: File
  previewUrl: string
}

export function CreatePostForm() {
  const [mediaList, setMediaList] = useState<LocalMediaItem[]>([])
  const [caption, setCaption] = useState('')
  const [visibility, setVisibility] = useState<'public' | 'followers_only' | 'private'>('public')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const router = useRouter()
  const { showToast } = useToast()
  const supabase = createClient()

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return

    const selectedFiles = Array.from(e.target.files)
    const newItems: LocalMediaItem[] = selectedFiles.map((file) => ({
      id: Math.random().toString(36).substring(2, 9),
      file,
      previewUrl: URL.createObjectURL(file),
    }))

    setMediaList((prev) => [...prev, ...newItems])
  }

  const removeMedia = (id: string) => {
    setMediaList((prev) => {
      const target = prev.find((item) => item.id === id)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((item) => item.id !== id)
    })
  }

  const moveMedia = (index: number, direction: 'left' | 'right') => {
    if (
      (direction === 'left' && index === 0) ||
      (direction === 'right' && index === mediaList.length - 1)
    ) {
      return
    }

    const targetIndex = direction === 'left' ? index - 1 : index + 1
    const copy = [...mediaList]
    const temp = copy[index]
    copy[index] = copy[targetIndex]
    copy[targetIndex] = temp
    setMediaList(copy)
  }

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault()

    if (mediaList.length === 0) {
      showToast('Please select at least one image for your post', 'error')
      return
    }

    setUploading(true)
    setUploadProgress(10)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        showToast('You must be logged in to create a post', 'error')
        setUploading(false)
        return
      }

      // 1. Create Post Database Row
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          caption: caption.trim(),
          visibility,
        })
        .select()
        .single()

      if (postError || !postData) {
        throw new Error(postError?.message || 'Failed to create post record')
      }

      setUploadProgress(30)

      // 2. Upload images to Supabase Storage and Insert into post_media
      const totalCount = mediaList.length
      const postMediaRows = []

      for (let i = 0; i < totalCount; i++) {
        const item = mediaList[i]
        const uploadResult = await uploadMediaFile(item.file, 'post-media')

        postMediaRows.push({
          post_id: postData.id,
          media_url: uploadResult.url,
          media_type: 'image' as const,
          position: i,
        })

        setUploadProgress(Math.floor(30 + ((i + 1) / totalCount) * 60))
      }

      // 3. Batch insert post_media
      const { error: mediaInsertError } = await supabase
        .from('post_media')
        .insert(postMediaRows)

      if (mediaInsertError) {
        // Rollback post on media failure
        await supabase.from('posts').delete().eq('id', postData.id)
        throw new Error(`Media linking failed: ${mediaInsertError.message}`)
      }

      setUploadProgress(100)
      showToast('Post published successfully!', 'success')

      // Fetch username for redirect
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single()

      router.push(profile?.username ? `/profile/${profile.username}` : '/')
      router.refresh()
    } catch (err: any) {
      showToast(err.message || 'Post creation failed', 'error')
    } finally {
      setUploading(false)
    }
  }

  return (
    <form onSubmit={handlePublish} className="glass-card rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10 shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Create New Post
            <Sparkles className="w-5 h-5 text-pink-400" />
          </h2>
          <p className="text-xs text-slate-400">Share single photos or multi-image carousels</p>
        </div>

        {/* Visibility Selector */}
        <div className="flex items-center gap-2 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => setVisibility('public')}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              visibility === 'public'
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Public - Visible to everyone"
          >
            <Globe className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Public</span>
          </button>
          <button
            type="button"
            onClick={() => setVisibility('followers_only')}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              visibility === 'followers_only'
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Followers Only"
          >
            <Users className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Followers</span>
          </button>
          <button
            type="button"
            onClick={() => setVisibility('private')}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              visibility === 'private'
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Only Me"
          >
            <Lock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Only Me</span>
          </button>
        </div>
      </div>

      {/* Upload Dropzone & Media Previews */}
      <div className="space-y-4">
        {mediaList.length === 0 ? (
          <label className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-700/80 rounded-3xl bg-slate-900/40 hover:bg-slate-900/70 hover:border-pink-500/50 transition-all cursor-pointer group p-6">
            <div className="p-4 rounded-full bg-slate-800/80 text-pink-400 group-hover:scale-110 transition-transform mb-3">
              <Upload className="w-8 h-8" />
            </div>
            <p className="text-sm font-bold text-white mb-1">Click or drag images to upload</p>
            <p className="text-xs text-slate-400">Supports JPG, PNG, WEBP (Up to 10MB per file)</p>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">
                Selected Media ({mediaList.length})
              </span>
              <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-pink-400 hover:text-pink-300 transition-colors cursor-pointer">
                <ImageIcon className="w-3.5 h-3.5" />
                Add More Images
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            </div>

            {/* Media Thumbnail Carousel Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {mediaList.map((item, index) => (
                <div
                  key={item.id}
                  className="relative aspect-square rounded-2xl overflow-hidden bg-slate-900 border border-slate-700/60 group shadow-md"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.previewUrl}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-full object-cover"
                  />

                  {/* Top Badge */}
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-slate-900/80 backdrop-blur-md text-[10px] font-bold text-white">
                    #{index + 1}
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => removeMedia(item.id)}
                    className="absolute top-2 right-2 p-1 rounded-full bg-rose-950/90 text-rose-300 hover:bg-rose-900 transition-all opacity-0 group-hover:opacity-100 shadow-md cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>

                  {/* Reorder Buttons */}
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-slate-900/80 backdrop-blur-md p-1 rounded-xl opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveMedia(index, 'left')}
                      className="p-1 text-slate-300 hover:text-white disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowLeft className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      disabled={index === mediaList.length - 1}
                      onClick={() => moveMedia(index, 'right')}
                      className="p-1 text-slate-300 hover:text-white disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Caption Text Area */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
          Caption
        </label>
        <textarea
          rows={4}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Write a caption... #photography #pixora"
          className="w-full p-4 rounded-2xl glass-input focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm resize-none"
        />
      </div>

      {/* Upload Progress Bar */}
      {uploading && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-slate-400 font-medium">
            <span>Uploading media & publishing post...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Publish Button */}
      <button
        type="submit"
        disabled={uploading || mediaList.length === 0}
        className="w-full py-4 rounded-2xl gradient-btn text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-xl cursor-pointer disabled:opacity-50"
      >
        {uploading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <Upload className="w-4 h-4" /> Share Post
          </>
        )}
      </button>
    </form>
  )
}
