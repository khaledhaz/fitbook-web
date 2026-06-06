import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, RefreshCw, CheckCircle, Dumbbell } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../components/ui/Toast'

export function EmailVerificationPage() {
  const { user, isLoading } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [resending, setResending] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [checking, setChecking] = useState(false)

  // Tick down cooldown
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000)
    return () => clearInterval(t)
  }, [cooldown])

  // Auto-check: if the user's email is already confirmed, proceed
  useEffect(() => {
    if (isLoading) return
    if (!user) {
      navigate('/signin', { replace: true })
      return
    }
    if (user.email_confirmed_at) {
      navigate('/', { replace: true })
    }
  }, [user, isLoading, navigate])

  const handleResend = async () => {
    if (!user?.email || cooldown > 0) return
    setResending(true)
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: user.email,
    })
    setResending(false)
    if (error) {
      toast(error.message ?? 'Could not resend. Try again.', 'error')
    } else {
      toast('Verification email sent!', 'success')
      setCooldown(60)
    }
  }

  const handleCheckStatus = async () => {
    setChecking(true)
    try {
      const { data, error } = await supabase.auth.refreshSession()
      if (error) throw error
      if (data.user?.email_confirmed_at) {
        toast('Email confirmed! Redirecting…', 'success')
        setTimeout(() => navigate('/', { replace: true }), 800)
      } else {
        toast('Email not yet confirmed. Check your inbox.', 'info')
      }
    } catch (e) {
      toast((e as Error).message ?? 'Could not check status', 'error')
    } finally {
      setChecking(false)
    }
  }

  const email = user?.email ?? 'your email'

  return (
    <div className="min-h-dvh bg-bg flex flex-col items-center justify-center px-4 py-8">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-10">
        <Dumbbell className="w-6 h-6 text-primary" aria-hidden="true" />
        <span className="text-xl font-bold text-text tracking-tight">FitBook</span>
      </div>

      <div className="w-full max-w-sm flex flex-col items-center text-center">
        {/* Icon */}
        <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mb-6">
          <Mail className="w-9 h-9 text-primary" aria-hidden="true" />
        </div>

        <h1 className="text-2xl font-bold text-text mb-2">Check your inbox</h1>
        <p className="text-sm text-text-secondary mb-1">
          We sent a verification link to
        </p>
        <p className="text-sm font-semibold text-primary mb-6 break-all">{email}</p>

        <p className="text-xs text-text-tertiary mb-8 leading-relaxed max-w-xs">
          Click the link in the email to verify your account. After confirming,
          return here and tap the button below.
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-3 w-full">
          <Button
            fullWidth
            leftIcon={<CheckCircle className="w-5 h-5" />}
            onClick={handleCheckStatus}
            isLoading={checking}
          >
            I've confirmed my email
          </Button>

          <Button
            variant="secondary"
            fullWidth
            leftIcon={<RefreshCw className="w-4 h-4" />}
            onClick={handleResend}
            isLoading={resending}
            disabled={cooldown > 0}
            aria-label={
              cooldown > 0
                ? `Resend available in ${cooldown} seconds`
                : 'Resend verification email'
            }
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend email'}
          </Button>
        </div>

        <p className="text-xs text-text-tertiary mt-8">
          Wrong email?{' '}
          <button
            onClick={() => navigate('/signup', { replace: true })}
            className="text-primary underline underline-offset-2 hover:text-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            Sign up again
          </button>
        </p>
      </div>
    </div>
  )
}
