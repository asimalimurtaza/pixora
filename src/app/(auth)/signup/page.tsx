import { SignupForm } from '@/components/auth/SignupForm'

export const metadata = {
  title: 'Create Account • Pixora',
  description: 'Join Pixora today to share photos, stories, and messages with your community.',
}

export default function SignupPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white tracking-tight">Create Account</h2>
        <p className="text-xs text-slate-400 mt-1">
          Join Pixora and start sharing your world
        </p>
      </div>
      <SignupForm />
    </div>
  )
}
