'use client'

import React, { useState } from 'react'
import { BlockModal } from './BlockModal'
import { useToast } from '@/components/ui/Toast'
import { MoreHorizontal, ShieldAlert, Share2 } from 'lucide-react'

interface ProfileMoreMenuProps {
  targetUserId: string
  targetUsername: string
  initialBlocked: boolean
}

export function ProfileMoreMenu({
  targetUserId,
  targetUsername,
  initialBlocked,
}: ProfileMoreMenuProps) {
  const [open, setOpen] = useState(false)
  const [showBlockModal, setShowBlockModal] = useState(false)
  const [isBlocked, setIsBlocked] = useState(initialBlocked)
  const { showToast } = useToast()

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    showToast('Profile link copied!', 'success')
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-all cursor-pointer"
        title="More Options"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-44 rounded-2xl bg-slate-900 border border-slate-700/80 p-2 shadow-2xl z-30 space-y-1">
          <button
            onClick={handleCopyLink}
            className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-slate-200 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
          >
            <Share2 className="w-4 h-4 text-sky-400" />
            Share Profile
          </button>
          <button
            onClick={() => {
              setShowBlockModal(true)
              setOpen(false)
            }}
            className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 cursor-pointer"
          >
            <ShieldAlert className="w-4 h-4" />
            {isBlocked ? 'Unblock User' : 'Block User'}
          </button>
        </div>
      )}

      {showBlockModal && (
        <BlockModal
          targetUserId={targetUserId}
          targetUsername={targetUsername}
          isBlocked={isBlocked}
          onClose={() => setShowBlockModal(false)}
          onBlockStatusChanged={(blocked) => setIsBlocked(blocked)}
        />
      )}
    </div>
  )
}
