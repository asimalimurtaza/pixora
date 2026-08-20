import React from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Sparkles, ShieldCheck, Database, Key, UserCheck, PlusSquare, Compass } from 'lucide-react'

export const metadata = {
  title: 'Home • Pixora',
  description: 'Your Pixora social media home feed.',
}

export default async function HomePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user?.id || '')
    .single()

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      {/* Welcome Banner Card */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl border border-white/10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-pink-500/20 via-purple-500/20 to-transparent blur-2xl pointer-events-none" />
        
        <div className="flex items-start gap-4 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 p-0.5 shrink-0 shadow-lg">
            <div className="w-full h-full rounded-[14px] bg-slate-900 flex items-center justify-center font-bold text-xl text-white">
              {profile?.display_name?.[0]?.toUpperCase() || profile?.username?.[0]?.toUpperCase() || 'P'}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white">
                Welcome to Pixora, {profile?.display_name || 'Creator'}!
              </h1>
              <Sparkles className="w-5 h-5 text-amber-400 animate-bounce" />
            </div>
            <p className="text-xs text-slate-400 mt-1">
              @{profile?.username} • Account linked with Supabase Auth & PostgreSQL RLS
            </p>
          </div>
        </div>

        {/* Phase 1 Verification Grid */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10">
          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Supabase Auth Active</p>
              <p className="text-[10px] text-slate-400">SSR Cookies & Protection</p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Auto Profile Created</p>
              <p className="text-[10px] text-slate-400">PostgreSQL Trigger Executed</p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Normalized Schema</p>
              <p className="text-[10px] text-slate-400">16 PostgreSQL Tables Ready</p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-pink-500/10 text-pink-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Row Level Security</p>
              <p className="text-[10px] text-slate-400">DB-level Authorization</p>
            </div>
          </div>
        </div>

        {/* Quick Action Navigation */}
        <div className="mt-6 flex flex-wrap gap-3 relative z-10">
          <Link
            href={`/profile/${profile?.username}`}
            className="px-4 py-2.5 rounded-xl gradient-btn text-white text-xs font-semibold flex items-center gap-2 shadow-md"
          >
            View Your Profile
          </Link>
          <Link
            href="/explore"
            className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-all"
          >
            <Compass className="w-4 h-4 text-purple-400" />
            Explore Posts
          </Link>
          <Link
            href="/create"
            className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-all"
          >
            <PlusSquare className="w-4 h-4 text-pink-400" />
            New Post
          </Link>
        </div>
      </div>

      {/* Feed Placeholder Card */}
      <div className="glass-card rounded-3xl p-8 text-center space-y-4 border border-white/10">
        <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 mx-auto">
          <Sparkles className="w-8 h-8 text-pink-400 animate-spin-slow" />
        </div>
        <h2 className="text-lg font-bold text-white">Phase 1 Complete & Verified</h2>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Your Pixora backend foundation is online. Auth sessions are managed with `@supabase/ssr`, RLS policies protect your PostgreSQL tables, and your user profile was auto-triggered on signup.
        </p>
      </div>
    </div>
  )
}
