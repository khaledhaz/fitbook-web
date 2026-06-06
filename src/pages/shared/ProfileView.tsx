import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, BadgeCheck, Dumbbell, User as UserIcon } from 'lucide-react'
import { useUser, useTrainer } from '../../lib/api/users'
import { Avatar } from '../../components/ui/Avatar'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Skeleton } from '../../components/ui/Spinner'
import { ErrorState } from '../../components/ui/States'

export function ProfileViewPage() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()

  const userQ = useUser(userId)
  const trainerQ = useTrainer(userId)

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1)
    else navigate('/')
  }

  if (userQ.isLoading || trainerQ.isLoading) {
    return (
      <div className="page-container max-w-xl mx-auto">
        <Skeleton className="h-10 w-24 mb-6" />
        <div className="flex flex-col items-center mb-8">
          <Skeleton className="w-24 h-24 rounded-full mb-4" />
          <Skeleton className="h-6 w-40 mb-2" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    )
  }

  if (userQ.isError) {
    return (
      <div className="page-container">
        <ErrorState
          message="Could not load this profile."
          onRetry={() => userQ.refetch()}
        />
      </div>
    )
  }

  if (!userQ.data) {
    return (
      <div className="page-container flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="w-14 h-14 rounded-full bg-card-elevated flex items-center justify-center mb-4">
          <UserIcon className="w-7 h-7 text-text-tertiary" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-bold text-text mb-2">User not found</h2>
        <p className="text-sm text-text-secondary mb-6">This profile doesn't exist or may have been removed.</p>
        <Button variant="secondary" onClick={handleBack} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Go back
        </Button>
      </div>
    )
  }

  const profile = userQ.data
  const trainerData = trainerQ.data
  const isTrainer = !!trainerData
  const role = isTrainer ? 'Trainer' : 'Trainee'

  return (
    <div className="page-container max-w-xl mx-auto">
      {/* Back */}
      <Button
        variant="ghost"
        size="sm"
        leftIcon={<ArrowLeft className="w-4 h-4" />}
        onClick={handleBack}
        className="mb-6 -ml-2"
        aria-label="Go back"
      >
        Back
      </Button>

      {/* Hero */}
      <div className="flex flex-col items-center text-center mb-8">
        <div className="relative mb-4">
          <Avatar src={profile.photo_url} name={profile.display_name} size="xl" />
          {isTrainer && trainerData?.is_verified && (
            <div
              className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-gradient-to-br from-primary-light to-primary flex items-center justify-center border-2 border-bg"
              title="Verified trainer"
            >
              <BadgeCheck className="w-4 h-4 text-text-on-primary" aria-label="Verified" />
            </div>
          )}
        </div>

        <h1 className="text-2xl font-bold text-text mb-1 truncate max-w-full px-4">
          {profile.display_name ?? 'FitBook User'}
        </h1>
        {profile.username && (
          <p className="text-sm text-text-secondary mb-3">@{profile.username}</p>
        )}

        {/* Role badge */}
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 border border-primary/30 text-primary">
          {isTrainer ? (
            <Dumbbell className="w-3 h-3" aria-hidden="true" />
          ) : (
            <UserIcon className="w-3 h-3" aria-hidden="true" />
          )}
          {role}
        </span>
      </div>

      {/* Bio (trainer only) */}
      {isTrainer && trainerData?.bio && (
        <Card className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-text-tertiary mb-2">
            About
          </p>
          <p className="text-sm text-text leading-relaxed">{trainerData.bio}</p>
        </Card>
      )}

      {/* Details */}
      <Card>
        <p className="text-xs font-semibold uppercase tracking-widest text-text-tertiary mb-3">
          Info
        </p>
        <dl className="flex flex-col gap-2">
          <DetailRow label="Role" value={role} />
          {isTrainer && trainerData?.is_verified && (
            <DetailRow label="Status" value="Verified Trainer" />
          )}
          {profile.preferred_units && (
            <DetailRow
              label="Units"
              value={profile.preferred_units === 'metric' ? 'Metric (kg, cm)' : 'Imperial (lb, in)'}
            />
          )}
          <DetailRow
            label="Member since"
            value={new Date(profile.created_at).toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric',
            })}
          />
        </dl>
      </Card>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <dt className="text-sm text-text-secondary flex-shrink-0">{label}</dt>
      <dd className="text-sm text-text font-medium text-right truncate min-w-0">{value}</dd>
    </div>
  )
}
