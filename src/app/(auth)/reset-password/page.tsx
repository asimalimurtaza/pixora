import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm'

export const metadata = {
  title: 'Set New Password • Pixora',
  description: 'Choose a new password for your Pixora account.',
}

export default function ResetPasswordPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white tracking-tight">Set New Password</h2>
        <p className="text-xs text-slate-400 mt-1">
          Enter your new password below
        </p>
      </div>
      <ResetPasswordForm />
    </div>
  )
}
