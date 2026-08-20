'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { Mail, Loader2, ArrowLeft, Send } from 'lucide-react'

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  
  const { showToast } = useToast()
  const supabase = createClient()

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      showToast('Please enter your email address', 'error')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        showToast(error.message, 'error')
      } else {
        setSubmitted(true)
        showToast('Password reset link sent! Check your inbox.', 'success')
      }
    } catch (err: any) {
      showToast(err.message || 'An error occurred', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full space-y-6">
      {submitted ? (
        <div className="text-center space-y-4 py-4">
          <div className="w-12 h-12 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-400 flex items-center justify-center mx-auto">
            <Send className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">Reset Link Sent</h3>
          <p className="text-sm text-slate-300">
            We sent a password recovery link to <span className="font-semibold text-purple-300">{email}</span>.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-semibold text-purple-400 hover:text-purple-300 transition-colors pt-2"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Sign In
          </Link>
        </div>
      ) : (
        <form onSubmit={handleResetRequest} className="space-y-4">
          <p className="text-xs text-slate-400">
            Enter your registered email address and we&apos;ll send you a link to reset your password.
          </p>

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

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl gradient-btn text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Reset Link'}
          </button>

          <div className="text-center pt-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
            </Link>
          </div>
        </form>
      )}
    </div>
  )
}
