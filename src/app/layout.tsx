import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ToastProvider } from '@/components/ui/Toast'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { PresenceProvider } from '@/components/providers/PresenceProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Zeloria • Share your story',
  description: 'A modern visual social platform for creators and communities.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen bg-slate-950 text-slate-100 antialiased`}>
        <ThemeProvider>
          <ToastProvider>
            <PresenceProvider>
              {children}
            </PresenceProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
