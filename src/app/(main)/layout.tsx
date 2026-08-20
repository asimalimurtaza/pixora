import React from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/navigation/Sidebar'
import { MobileNav } from '@/components/navigation/MobileNav'
import { Header } from '@/components/navigation/Header'
import { RightSidebar } from '@/components/navigation/RightSidebar'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch application profile for current user
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100">
      {/* Left Desktop Sidebar */}
      <Sidebar userProfile={profile} />

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        <Header />
        <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex gap-8">
          <div className="flex-1 min-w-0">{children}</div>
          <RightSidebar currentUserProfile={profile} />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav username={profile?.username} />
    </div>
  )
}
