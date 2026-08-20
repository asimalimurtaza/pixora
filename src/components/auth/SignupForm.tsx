'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { Eye, EyeOff, Lock, Mail, User, AtSign, Loader2, ArrowRight } from 'lucide-react'

export function SignupForm() {
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const router = useRouter()
  const { showToast } = useToast()
  const supabase = createClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
    if (cleanUsername.length < 3) {
      showToast('Username must be at least 3 characters long', 'error')
      return
    }

    if (password.length < 6) {
      showToast('Password must be at least 6 characters', 'error')
      return
    }

    if (password !== confirmPassword) {
      showToast('Passwords do not match', 'error')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: cleanUsername,
            display_name: displayName.trim() || cleanUsername,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        showToast(error.message, 'error')
      } else {
        if (data.session) {
          showToast('Account created successfully! Welcome to Pixora.', 'success')
          router.push('/')
          router.refresh()
        } else {
          showToast('Account created! Please check your email to verify your account.', 'info')
          router.push('/login')
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Signup failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    setGoogleLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) {
        showToast(error.message, 'error')
        setGoogleLoading(false)
      }
    } catch (err: any) {
      showToast(err.message || 'OAuth error', 'error')
      setGoogleLoading(false)
    }
  }

  return (
    <div className="w-full space-y-6">
      <form onSubmit={handleSignup} className="space-y-4">
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
              className="w-full pl-10 pr-4 py-3 rounded-xl glass-input focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-sm"
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
              className="w-full pl-10 pr-4 py-3 rounded-xl glass-input focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              className="w-full pl-10 pr-4 py-3 rounded-xl glass-input focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl glass-input focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-10 pr-10 py-3 rounded-xl glass-input focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || googleLoading}
          className="w-full py-3.5 rounded-xl gradient-btn text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer mt-2"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              Create Account
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="relative flex items-center justify-center my-4">
        <div className="border-t border-slate-700/60 w-full" />
        <span className="bg-slate-900 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider shrink-0">
          Or join with
        </span>
      </div>

      <button
        type="button"
        onClick={handleGoogleSignup}
        disabled={loading || googleLoading}
        className="w-full py-3 rounded-xl border border-slate-700 bg-slate-800/40 hover:bg-slate-800/80 transition-all text-slate-200 font-medium text-sm flex items-center justify-center gap-3 cursor-pointer"
      >
        {googleLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Sign up with Google
          </>
        )}
      </button>

      <p className="text-center text-xs text-slate-400">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-purple-400 hover:text-purple-300 transition-colors">
          Log in
        </Link>
      </p>
    </div>
  )
}
