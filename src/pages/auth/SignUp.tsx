import React, { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Dumbbell, Dumbbell as TrainerIcon, User } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useToast } from '../../components/ui/Toast'
import { cn } from '../../utils/cn'

type Role = 'trainee' | 'trainer'

export function SignUpPage() {
  const { signUp, user, role } = useAuth()
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedRole, setSelectedRole] = useState<Role>('trainee')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (user && role !== 'loading') {
    return <Navigate to={role === 'trainer' ? '/trainer/home' : '/home'} replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return
    setError(null)
    setIsLoading(true)
    const { error } = await signUp(email, password, selectedRole)
    setIsLoading(false)
    if (error) {
      setError(error.message)
      toast(error.message, 'error')
    } else {
      toast('Account created! Check your email.', 'success')
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-bg px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
            <Dumbbell className="w-8 h-8 text-primary" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-text">Create account</h1>
          <p className="text-text-secondary text-sm mt-1">Join FitBook today</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          {/* Role selection */}
          <div>
            <p className="text-sm font-medium text-text-secondary mb-2" id="role-label">
              I am a…
            </p>
            <div className="grid grid-cols-2 gap-3" role="group" aria-labelledby="role-label">
              <RoleCard
                role="trainee"
                selected={selectedRole === 'trainee'}
                onSelect={() => setSelectedRole('trainee')}
                icon={User}
                title="Trainee"
                description="I want to train"
              />
              <RoleCard
                role="trainer"
                selected={selectedRole === 'trainer'}
                onSelect={() => setSelectedRole('trainer')}
                icon={TrainerIcon}
                title="Trainer"
                description="I coach others"
              />
            </div>
          </div>

          <Input
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
          />
          <Input
            label="Password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Min 8 characters"
            minLength={8}
            error={error ?? undefined}
          />

          <Button type="submit" fullWidth isLoading={isLoading} className="mt-2">
            Create Account
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-text-secondary">
          Already have an account?{' '}
          <a href="/#/signin" className="text-primary hover:text-primary-light font-medium">
            Sign in
          </a>
        </p>
      </div>
    </div>
  )
}

interface RoleCardProps {
  role: Role
  selected: boolean
  onSelect: () => void
  icon: React.ElementType
  title: string
  description: string
}

function RoleCard({ selected, onSelect, icon: Icon, title, description }: RoleCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'p-3 rounded-lg border text-left transition-all min-h-[80px]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        selected
          ? 'border-primary bg-primary/10'
          : 'border-border bg-card hover:bg-card-elevated'
      )}
      aria-pressed={selected}
    >
      <Icon
        className={cn('w-5 h-5 mb-1', selected ? 'text-primary' : 'text-text-tertiary')}
        aria-hidden="true"
      />
      <p className={cn('text-sm font-semibold', selected ? 'text-primary' : 'text-text')}>
        {title}
      </p>
      <p className="text-xs text-text-tertiary">{description}</p>
    </button>
  )
}
