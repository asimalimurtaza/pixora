'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { Eye, EyeOff, Lock, Loader2, CheckCircle } from 'lucide-react'

export function ResetPasswordForm() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const router = useRouter()
  const { showToast } = useToast()
  const supabase = createClient()

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()

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
      const { error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) {
        showToast(error.message, 'error')
      } else {
        showToast('Password updated successfully! You can now log in.', 'success')
        router.push('/login')
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update password', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleUpdatePassword} className="w-full space-y-4">
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
          New Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
          Confirm New Password
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
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3.5 rounded-xl gradient-btn text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <CheckCircle className="w-4 h-4" /> Update Password
          </>
        )}
      </button>
    </form>
  )
}
