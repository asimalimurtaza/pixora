'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { User, AtSign, Globe, FileText, Loader2, Save, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function SettingsPage() {
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [website, setWebsite] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const router = useRouter()
  const { showToast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profile) {
        setDisplayName(profile.display_name || '')
        setUsername(profile.username || '')
        setBio(profile.bio || '')
        setWebsite(profile.website || '')
        setAvatarUrl(profile.avatar_url || '')
      }
      setLoading(false)
    }

    loadProfile()
  }, [supabase, router])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
    if (cleanUsername.length < 3) {
      showToast('Username must be at least 3 characters', 'error')
      return
    }

    setSaving(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim(),
          username: cleanUsername,
          bio: bio.trim(),
          website: website.trim(),
          avatar_url: avatarUrl.trim(),
        })
        .eq('id', user.id)

      if (error) {
        showToast(error.message, 'error')
      } else {
        showToast('Profile updated successfully!', 'success')
        router.push(`/profile/${cleanUsername}`)
        router.refresh()
      }
    } catch (err: any) {
      showToast(err.message || 'Save failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Edit Profile</h1>
          <p className="text-xs text-slate-400">Update your account details and public persona</p>
        </div>
        <Link
          href={`/profile/${username}`}
          className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" /> Cancel
        </Link>
      </div>

      <form onSubmit={handleSave} className="glass-card rounded-3xl p-6 sm:p-8 space-y-5 border border-white/10 shadow-xl">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Display Name
          </label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Jane Doe"
              required
              className="w-full pl-10 pr-4 py-3 rounded-xl glass-input focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Username
          </label>
          <div className="relative">
            <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="janedoe"
              required
              className="w-full pl-10 pr-4 py-3 rounded-xl glass-input focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Bio
          </label>
          <div className="relative">
            <FileText className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell the community about yourself..."
              className="w-full pl-10 pr-4 py-3 rounded-xl glass-input focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm resize-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Website URL
          </label>
          <div className="relative">
            <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://yourwebsite.com"
              className="w-full pl-10 pr-4 py-3 rounded-xl glass-input focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Avatar Image URL
          </label>
          <input
            type="url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://images.unsplash.com/..."
            className="w-full px-4 py-3 rounded-xl glass-input focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3.5 rounded-xl gradient-btn text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Save className="w-4 h-4" /> Save Changes
            </>
          )}
        </button>
      </form>
    </div>
  )
}
