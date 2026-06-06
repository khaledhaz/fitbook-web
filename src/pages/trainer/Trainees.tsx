import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Users, ChevronRight } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { useTrainerTrainees } from '../../lib/api/users'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Avatar } from '../../components/ui/Avatar'
import { SkeletonCard } from '../../components/ui/Spinner'
import { EmptyState, ErrorState } from '../../components/ui/States'

export function TraineesPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [search, setSearch] = useState('')

  const traineesQ = useTrainerTrainees(user?.id)
  const trainees = traineesQ.data ?? []

  const filtered = useMemo(() => {
    if (!search.trim()) return trainees
    const q = search.toLowerCase()
    return trainees.filter(
      (t) =>
        (t.users?.display_name ?? '').toLowerCase().includes(q) ||
        (t.users?.username ?? '').toLowerCase().includes(q)
    )
  }, [trainees, search])

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-text">Trainees</h1>
          {trainees.length > 0 && (
            <p className="text-sm text-text-secondary mt-0.5">
              {trainees.length} trainee{trainees.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      {/* Search */}
      {(traineesQ.isLoading || trainees.length > 0) && (
        <div className="mb-4">
          <Input
            label="Search trainees"
            placeholder="Name or username…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
            aria-label="Search trainees"
          />
        </div>
      )}

      {/* Error */}
      {traineesQ.isError && (
        <ErrorState
          message="Could not load trainees."
          onRetry={() => traineesQ.refetch()}
        />
      )}

      {/* Loading skeleton */}
      {traineesQ.isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((k) => (
            <SkeletonCard key={k} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!traineesQ.isLoading && !traineesQ.isError && trainees.length === 0 && (
        <EmptyState
          icon={<Users className="w-7 h-7 text-text-tertiary" />}
          title="No trainees yet"
          description="Share your invite link from the dashboard to onboard trainees."
          action={{
            label: 'Go to Dashboard',
            onClick: () => navigate('/trainer/home'),
          }}
        />
      )}

      {/* No search match */}
      {!traineesQ.isLoading && !traineesQ.isError && trainees.length > 0 && filtered.length === 0 && (
        <EmptyState
          icon={<Search className="w-7 h-7 text-text-tertiary" />}
          title="No results"
          description={`No trainees match "${search}".`}
        />
      )}

      {/* Grid */}
      {!traineesQ.isLoading && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" role="list" aria-label="Trainee roster">
          {filtered.map((t) => (
            <TraineeListCard
              key={t.id}
              displayName={t.users?.display_name}
              photoUrl={t.users?.photo_url}
              username={t.users?.username}
              traineeId={t.id}
              onClick={() => navigate(`/trainer/trainee/${t.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── TraineeListCard ───────────────────────────────────────────────────────────

interface TraineeListCardProps {
  displayName: string | null | undefined
  photoUrl: string | null | undefined
  username: string | null | undefined
  traineeId: string
  onClick: () => void
}

function TraineeListCard({
  displayName,
  photoUrl,
  username,
  onClick,
}: TraineeListCardProps) {
  return (
    <Card
      as="button"
      onClick={onClick}
      className="flex items-center gap-3 w-full text-left hover:bg-card-elevated transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
      role="listitem"
      aria-label={`Open ${displayName ?? 'trainee'} workspace`}
    >
      <Avatar src={photoUrl} name={displayName} size="md" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text truncate">
          {displayName ?? 'Trainee'}
        </p>
        {username && (
          <p className="text-xs text-text-tertiary truncate">@{username}</p>
        )}
      </div>
      <ChevronRight className="w-4 h-4 text-text-tertiary flex-shrink-0" aria-hidden="true" />
    </Card>
  )
}
