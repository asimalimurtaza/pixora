import React from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NavigationRail } from '@/components/navigation/NavigationRail'
import { ContextRail } from '@/components/navigation/ContextRail'
import { MobileDock } from '@/components/navigation/MobileDock'
import { Header } from '@/components/navigation/Header'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch current user application profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100">
      {/* Compact Desktop Navigation Rail */}
      <NavigationRail userProfile={profile} />

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-0">
        <Header />
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex gap-8">
          <div className="flex-1 min-w-0">{children}</div>
          <ContextRail currentUserProfile={profile} />
        </main>
      </div>

      {/* Floating Mobile Bottom Dock */}
      <MobileDock username={profile?.username} />
    </div>
  )
}
