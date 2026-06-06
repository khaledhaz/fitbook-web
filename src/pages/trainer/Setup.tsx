import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Copy, ChevronRight, Dumbbell } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { useUser, useUpdateUser } from '../../lib/api/users'
import { useUpdateTrainerProfile } from './_shared/hooks'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Input'
import { PageSpinner } from '../../components/ui/Spinner'
import { ErrorState } from '../../components/ui/States'
import { useToast } from '../../components/ui/Toast'
import { cn } from '../../utils/cn'

// ─── Steps ─────────────────────────────────────────────────────────────────────

type StepId = 'welcome' | 'identity' | 'bio' | 'invite'

const STEPS: { id: StepId; label: string }[] = [
  { id: 'welcome', label: 'Welcome' },
  { id: 'identity', label: 'Identity' },
  { id: 'bio', label: 'Profile' },
  { id: 'invite', label: 'Invite' },
]

// ─── Main page ─────────────────────────────────────────────────────────────────

export function TrainerSetupPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()

  const userQ = useUser(user?.id)
  const updateUser = useUpdateUser()
  const updateTrainer = useUpdateTrainerProfile()

  const [step, setStep] = useState<StepId>('welcome')
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [portfolioUrl, setPortfolioUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)

  const stepIndex = STEPS.findIndex((s) => s.id === step)

  const inviteLink =
    username.trim()
      ? `${window.location.origin}${window.location.pathname}#/join/${username.trim()}`
      : null

  const handleSaveIdentity = async () => {
    if (!user?.id) return
    if (!displayName.trim()) {
      toast('Please enter your display name.', 'error')
      return
    }
    setSaving(true)
    try {
      await updateUser.mutateAsync({
        id: user.id,
        display_name: displayName.trim(),
        username: username.trim() || null,
      })
      setStep('bio')
    } catch (e) {
      toast((e as Error).message ?? 'Failed to save.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveBio = async () => {
    if (!user?.id) return
    setSaving(true)
    try {
      await updateTrainer.mutateAsync({
        trainerId: user.id,
        bio: bio.trim() || null,
        portfolio_url: portfolioUrl.trim() || null,
      })
      setStep('invite')
    } catch (e) {
      toast((e as Error).message ?? 'Failed to save.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleCopy = async () => {
    if (!inviteLink) return
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      toast('Invite link copied!', 'success')
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast('Could not copy automatically.', 'error')
    }
  }

  const handleFinish = () => {
    navigate('/trainer/home', { replace: true })
  }

  if (userQ.isLoading) return <PageSpinner />
  if (userQ.isError) {
    return (
      <ErrorState
        message="Could not load account data."
        onRetry={() => userQ.refetch()}
      />
    )
  }

  return (
    <div className="min-h-dvh bg-bg flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Brand mark */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          <Dumbbell className="w-7 h-7 text-primary" aria-hidden="true" />
          <span className="text-2xl font-bold text-text tracking-tight">FitBook</span>
        </div>

        {/* Step indicator */}
        <nav aria-label="Setup progress" className="flex items-center gap-1 mb-6 justify-center">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.id}>
              <div
                className={cn(
                  'flex items-center gap-1.5 text-xs font-medium transition-colors',
                  stepIndex >= i ? 'text-primary' : 'text-text-muted'
                )}
                aria-current={s.id === step ? 'step' : undefined}
              >
                <span
                  className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                    stepIndex > i
                      ? 'bg-primary text-text-on-primary'
                      : stepIndex === i
                      ? 'bg-primary/20 text-primary border border-primary'
                      : 'bg-card text-text-muted border border-border'
                  )}
                >
                  {stepIndex > i ? <Check className="w-3 h-3" /> : i + 1}
                </span>
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={cn('flex-1 h-px max-w-[24px]', stepIndex > i ? 'bg-primary/40' : 'bg-border')}
                  aria-hidden="true"
                />
              )}
            </React.Fragment>
          ))}
        </nav>

        {/* Step panels */}
        <Card padding="lg">
          {step === 'welcome' && (
            <WelcomeStep onNext={() => setStep('identity')} />
          )}

          {step === 'identity' && (
            <IdentityStep
              displayName={displayName}
              setDisplayName={setDisplayName}
              username={username}
              setUsername={setUsername}
              onSave={handleSaveIdentity}
              isLoading={saving}
            />
          )}

          {step === 'bio' && (
            <BioStep
              bio={bio}
              setBio={setBio}
              portfolioUrl={portfolioUrl}
              setPortfolioUrl={setPortfolioUrl}
              onSave={handleSaveBio}
              onSkip={() => setStep('invite')}
              isLoading={saving}
            />
          )}

          {step === 'invite' && (
            <InviteStep
              inviteLink={inviteLink}
              copied={copied}
              onCopy={handleCopy}
              onFinish={handleFinish}
              username={username}
              onGoToProfile={() => navigate('/trainer/profile')}
            />
          )}
        </Card>
      </div>
    </div>
  )
}

// ─── Step: Welcome ─────────────────────────────────────────────────────────────

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center">
      <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
        <Dumbbell className="w-8 h-8 text-primary" aria-hidden="true" />
      </div>
      <h1 className="text-2xl font-bold text-text mb-2">Welcome to FitBook!</h1>
      <p className="text-text-secondary text-sm mb-6">
        Let's set up your trainer profile in a few quick steps so your trainees can find and connect with you.
      </p>
      <Button fullWidth onClick={onNext} rightIcon={<ChevronRight className="w-4 h-4" />}>
        Get Started
      </Button>
    </div>
  )
}

// ─── Step: Identity ────────────────────────────────────────────────────────────

function IdentityStep({
  displayName,
  setDisplayName,
  username,
  setUsername,
  onSave,
  isLoading,
}: {
  displayName: string
  setDisplayName: (v: string) => void
  username: string
  setUsername: (v: string) => void
  onSave: () => void
  isLoading: boolean
}) {
  return (
    <div>
      <h2 className="text-xl font-bold text-text mb-1">Your identity</h2>
      <p className="text-sm text-text-secondary mb-5">
        How trainees will see you in the app.
      </p>
      <div className="flex flex-col gap-4">
        <Input
          label="Display name *"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="e.g. Alex Johnson"
          aria-label="Display name"
          required
        />
        <Input
          label="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value.replace(/[^a-z0-9_]/gi, '').toLowerCase())}
          placeholder="e.g. alexfit"
          aria-label="Username"
          hint="Used in your invite link. Letters, numbers, underscores only."
        />
      </div>
      <Button
        fullWidth
        className="mt-6"
        onClick={onSave}
        isLoading={isLoading}
        disabled={!displayName.trim()}
        rightIcon={<ChevronRight className="w-4 h-4" />}
      >
        Continue
      </Button>
    </div>
  )
}

// ─── Step: Bio ─────────────────────────────────────────────────────────────────

function BioStep({
  bio,
  setBio,
  portfolioUrl,
  setPortfolioUrl,
  onSave,
  onSkip,
  isLoading,
}: {
  bio: string
  setBio: (v: string) => void
  portfolioUrl: string
  setPortfolioUrl: (v: string) => void
  onSave: () => void
  onSkip: () => void
  isLoading: boolean
}) {
  return (
    <div>
      <h2 className="text-xl font-bold text-text mb-1">About you</h2>
      <p className="text-sm text-text-secondary mb-5">
        Help trainees understand your approach (optional — you can update later).
      </p>
      <div className="flex flex-col gap-4">
        <Textarea
          label="Bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Certified personal trainer with 5+ years experience…"
          rows={4}
          aria-label="Bio"
        />
        <Input
          label="Portfolio / Website"
          value={portfolioUrl}
          onChange={(e) => setPortfolioUrl(e.target.value)}
          placeholder="https://yoursite.com"
          type="url"
          aria-label="Portfolio URL"
        />
      </div>
      <div className="flex gap-2 mt-6">
        <Button
          fullWidth
          onClick={onSave}
          isLoading={isLoading}
          rightIcon={<ChevronRight className="w-4 h-4" />}
        >
          Save & Continue
        </Button>
        <Button
          variant="ghost"
          onClick={onSkip}
          disabled={isLoading}
          className="flex-shrink-0"
        >
          Skip
        </Button>
      </div>
    </div>
  )
}

// ─── Step: Invite ──────────────────────────────────────────────────────────────

function InviteStep({
  inviteLink,
  copied,
  onCopy,
  onFinish,
  username,
  onGoToProfile,
}: {
  inviteLink: string | null
  copied: boolean
  onCopy: () => void
  onFinish: () => void
  username: string
  onGoToProfile: () => void
}) {
  return (
    <div>
      <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center mb-4 mx-auto">
        <Check className="w-7 h-7 text-primary" aria-hidden="true" />
      </div>
      <h2 className="text-xl font-bold text-text mb-1 text-center">You're all set!</h2>
      <p className="text-sm text-text-secondary mb-5 text-center">
        Share your invite link so trainees can connect with you.
      </p>

      {inviteLink ? (
        <div className="mb-5">
          <p className="text-xs text-text-tertiary mb-2 font-medium uppercase tracking-wide">
            Your invite link
          </p>
          <div className="flex items-center gap-2">
            <div
              className="flex-1 min-w-0 bg-input-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text-secondary truncate select-all"
              role="textbox"
              aria-label="Invite link"
              aria-readonly="true"
            >
              {inviteLink}
            </div>
            <button
              onClick={onCopy}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-primary text-text-on-primary font-semibold text-sm hover:bg-primary-dark transition-colors min-h-[44px] min-w-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              aria-label={copied ? 'Copied!' : 'Copy invite link'}
            >
              {copied ? (
                <Check className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Copy className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-card-elevated border border-border rounded-lg p-4 mb-5 text-center">
          <p className="text-sm text-text-secondary mb-2">
            No username set — your invite link won't be available.
          </p>
          <button
            onClick={onGoToProfile}
            className="text-sm text-primary hover:text-primary-light underline"
          >
            Add a username in Profile
          </button>
        </div>
      )}

      <Button fullWidth onClick={onFinish}>
        Go to Dashboard
      </Button>
    </div>
  )
}
