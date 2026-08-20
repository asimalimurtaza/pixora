import { LoginForm } from '@/components/auth/LoginForm'

export const metadata = {
  title: 'Sign In • Pixora',
  description: 'Log in to your Pixora account to connect with friends and share your moments.',
}

export default function LoginPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white tracking-tight">Welcome Back</h2>
        <p className="text-xs text-slate-400 mt-1">
          Enter your credentials to access your account
        </p>
      </div>
      <LoginForm />
    </div>
  )
}
