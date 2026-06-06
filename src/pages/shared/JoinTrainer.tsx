import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  BadgeCheck,
  Users,
  CalendarDays,
  Award,
  ArrowLeft,
  UserPlus,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { useSendConnectionRequest, useOutgoingConnectionRequests } from '../../lib/api/connections'
import { useTrainerByUsername } from './_shared/useTrainerByUsername'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Skeleton } from '../../components/ui/Spinner'
import { ErrorState } from '../../components/ui/States'
import { useToast } from '../../components/ui/Toast'
import { cn } from '../../utils/cn'

type JoinStatus = 'idle' | 'pending' | 'connected' | 'sent' | 'error'

export function JoinTrainerPage() {
  const { username } = useParams<{ username: string }>()
  const navigate = useNavigate()
  const { user, role, isLoading: authLoading } = useAuth()
  const { toast } = useToast()

  const profileQ = useTrainerByUsername(username)
  const outgoingQ = useOutgoingConnectionRequests(user?.id)
  const send = useSendConnectionRequest()

  const [joinStatus, setJoinStatus] = useState<JoinStatus>('idle')

  // Check if already connected or pending
  useEffect(() => {
    if (!outgoingQ.data || !profileQ.data) return
    const match = outgoingQ.data.find((r) => r.receiver_id === profileQ.data?.user_id)
    if (!match) return
    if (match.status === 'accepted') setJoinStatus('connected')
    else if (match.status === 'pending') setJoinStatus('pending')
  }, [outgoingQ.data, profileQ.data])

  const handleSend = async () => {
    if (!user || !profileQ.data) return
    try {
      await send.mutateAsync({
        sender_id: user.id,
        receiver_id: profileQ.data.user_id,
        type: 'trainer_request',
      })
      setJoinStatus('sent')
      toast('Request sent!', 'success')
    } catch (e) {
      setJoinStatus('error')
      toast((e as Error).message ?? 'Could not send request', 'error')
    }
  }

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1)
    else navigate(user ? (role === 'trainer' ? '/trainer/home' : '/home') : '/signin')
  }

  // Loading skeleton
  if (profileQ.isLoading || authLoading) {
    return (
      <div className="min-h-dvh bg-bg flex flex-col">
        <div className="flex-1 p-4 flex flex-col items-center max-w-lg mx-auto w-full">
          <div className="w-full flex items-center mb-8">
            <Skeleton className="w-10 h-10 rounded-lg" />
          </div>
          <Skeleton className="w-32 h-32 rounded-full mb-4" />
          <Skeleton className="h-7 w-48 mb-2" />
          <Skeleton className="h-4 w-24 mb-6" />
          <Skeleton className="h-20 w-full rounded-lg mb-4" />
        </div>
        <div className="p-4 border-t border-divider">
          <Skeleton className="h-[52px] w-full rounded-lg" />
        </div>
      </div>
    )
  }

  // Network error
  if (profileQ.isError) {
    return (
      <div className="min-h-dvh bg-bg flex flex-col items-center justify-center p-4">
        <ErrorState
          title="Connection error"
          message="Check your internet connection and try again."
          onRetry={() => profileQ.refetch()}
        />
        <Button variant="ghost" onClick={handleBack} leftIcon={<ArrowLeft className="w-4 h-4" />} className="mt-4">
          Go back
        </Button>
      </div>
    )
  }

  // Trainer not found
  if (!profileQ.data) {
    return (
      <div className="min-h-dvh bg-bg flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 rounded-full bg-card-elevated flex items-center justify-center mb-4">
          <Users className="w-8 h-8 text-text-tertiary" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-bold text-text mb-2">Trainer not found</h1>
        <p className="text-sm text-text-secondary mb-6 max-w-xs">
          @{username} doesn't exist or isn't a trainer on FitBook.
        </p>
        <Button variant="secondary" onClick={handleBack} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Go back
        </Button>
      </div>
    )
  }

  const profile = profileQ.data
  const memberSince = formatMemberSince(profile.member_since)

  return (
    <div className="min-h-dvh bg-bg flex flex-col">
      {/* Scrollable profile area */}
      <div className="flex-1 overflow-y-auto">
        {/* Nav */}
        <div className="px-4 pt-4 pb-2 flex items-center">
          <button
            onClick={handleBack}
            className="p-2 rounded-lg hover:bg-card text-text-secondary hover:text-text transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 pb-6 max-w-lg mx-auto w-full">
          {/* Hero */}
          <div className="flex flex-col items-center text-center mb-6">
            {/* Gold-glowing avatar */}
            <div
              className="relative mb-4"
              style={{ filter: 'drop-shadow(0 0 24px rgba(240,181,29,0.35))' }}
            >
              <div className="w-32 h-32 rounded-full p-[3px] bg-gradient-to-br from-primary-light via-primary to-primary-dark">
                <div className="w-full h-full rounded-full overflow-hidden bg-card flex items-center justify-center">
                  <Avatar src={profile.photo_url} name={profile.display_name} size="xl" />
                </div>
              </div>
              {profile.is_verified && (
                <div className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-gradient-to-br from-primary-light to-primary flex items-center justify-center border-2 border-bg">
                  <BadgeCheck className="w-4 h-4 text-text-on-primary" aria-label="Verified trainer" />
                </div>
              )}
            </div>

            <h1 className="text-2xl font-bold text-text mb-1 truncate max-w-full">
              {profile.display_name ?? 'Trainer'}
            </h1>
            {profile.username && (
              <p className="text-sm text-text-secondary mb-3">@{profile.username}</p>
            )}

            {/* Chips */}
            <div className="flex flex-wrap gap-2 justify-center">
              <Chip icon={Award} label="Fitness Coach" highlighted />
              {profile.is_verified && <Chip icon={BadgeCheck} label="Verified" highlighted />}
              <Chip icon={Users} label={`${profile.trainee_count} ${profile.trainee_count === 1 ? 'trainee' : 'trainees'}`} />
              {memberSince && <Chip icon={CalendarDays} label={memberSince} />}
            </div>
          </div>

          {/* Bio */}
          {profile.bio && (
            <Card className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-text-tertiary mb-2">
                About
              </p>
              <p className="text-sm text-text leading-relaxed">{profile.bio}</p>
            </Card>
          )}
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="border-t border-divider bg-card/95 backdrop-blur-sm px-4 py-4 flex-shrink-0">
        <div className="max-w-lg mx-auto w-full">
          <JoinCta
            profile={profile}
            user={user}
            role={role}
            joinStatus={joinStatus}
            isSending={send.isPending}
            onSend={handleSend}
            onSignUp={() => navigate('/signup')}
          />
        </div>
      </div>
    </div>
  )
}

// ─── CTA component ────────────────────────────────────────────────────────────

interface JoinCtaProps {
  profile: { display_name: string | null }
  user: { id: string } | null
  role: string
  joinStatus: JoinStatus
  isSending: boolean
  onSend: () => void
  onSignUp: () => void
}

function JoinCta({ profile, user, role, joinStatus, isSending, onSend, onSignUp }: JoinCtaProps) {
  const name = profile.display_name ?? 'this trainer'

  if (!user) {
    return (
      <Button fullWidth leftIcon={<UserPlus className="w-5 h-5" />} onClick={onSignUp}>
        Sign up to train with {name}
      </Button>
    )
  }

  if (role === 'trainer') {
    return (
      <div className="flex items-center justify-center gap-2 py-3 px-4 bg-input-bg border border-border rounded-lg text-text-secondary text-sm">
        <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
        Invite links are for trainees
      </div>
    )
  }

  if (joinStatus === 'connected') {
    return (
      <StatusBox
        icon={<CheckCircle className="w-5 h-5 text-primary" />}
        message="Already connected!"
        className="bg-primary/10 border-primary/30 text-primary"
      />
    )
  }

  if (joinStatus === 'pending') {
    return (
      <StatusBox
        icon={<Clock className="w-5 h-5 text-warning" />}
        message="Request already pending"
        className="bg-warning/10 border-warning/30 text-warning"
      />
    )
  }

  if (joinStatus === 'sent') {
    return (
      <div className="flex flex-col items-center gap-1 py-3 px-4 bg-success/10 border border-success/30 rounded-lg">
        <div className="flex items-center gap-2 text-success font-semibold text-sm">
          <CheckCircle className="w-5 h-5" aria-hidden="true" />
          Request sent!
        </div>
        <p className="text-xs text-text-secondary">{name} will review your request.</p>
      </div>
    )
  }

  if (joinStatus === 'error') {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-xs text-error text-center">Something went wrong. Try again.</p>
        <Button fullWidth leftIcon={<UserPlus className="w-5 h-5" />} onClick={onSend} isLoading={isSending}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <Button
      fullWidth
      leftIcon={<UserPlus className="w-5 h-5" />}
      onClick={onSend}
      isLoading={isSending}
    >
      Send Connection Request
    </Button>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Chip({
  icon: Icon,
  label,
  highlighted = false,
}: {
  icon: React.ElementType
  label: string
  highlighted?: boolean
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border',
        highlighted
          ? 'bg-primary/14 border-primary/45 text-primary'
          : 'bg-card-elevated/70 border-border/60 text-text-secondary'
      )}
    >
      <Icon className="w-3 h-3" aria-hidden="true" />
      {label}
    </span>
  )
}

function StatusBox({
  icon,
  message,
  className,
}: {
  icon: React.ReactNode
  message: string
  className: string
}) {
  return (
    <div className={cn('flex items-center justify-center gap-2 py-3 px-4 rounded-lg border text-sm font-semibold', className)}>
      {icon}
      {message}
    </div>
  )
}

function formatMemberSince(iso: string | null): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  } catch {
    return ''
  }
}
