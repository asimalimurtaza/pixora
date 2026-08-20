import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm'

export const metadata = {
  title: 'Reset Password • Pixora',
  description: 'Recover your Pixora account password.',
}

export default function ForgotPasswordPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white tracking-tight">Forgot Password</h2>
        <p className="text-xs text-slate-400 mt-1">
          Recover access to your account
        </p>
      </div>
      <ForgotPasswordForm />
    </div>
  )
}
