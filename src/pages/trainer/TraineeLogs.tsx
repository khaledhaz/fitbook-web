import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Dumbbell, CheckCircle2, Clock } from 'lucide-react'
import { useUser } from '../../lib/api/users'
import { useWorkoutSessions } from '../../lib/api/workouts'
import { Card } from '../../components/ui/Card'
import { Avatar } from '../../components/ui/Avatar'
import { Skeleton } from '../../components/ui/Spinner'
import { EmptyState, ErrorState } from '../../components/ui/States'
import { colors } from '../../theme'

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function durationMinutes(start: string, end: string | null): string {
  if (!end) return 'In progress'
  const ms = new Date(end).getTime() - new Date(start).getTime()
  const mins = Math.round(ms / 60000)
  if (mins < 60) return `${mins} min`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

// ─── Adherence calculation ─────────────────────────────────────────────────────

function getAdherence(sessions: ReturnType<typeof useWorkoutSessions>['data']): {
  totalSessions: number
  completedSessions: number
  thisWeek: number
  adherenceRate: number
} {
  if (!sessions || sessions.length === 0) {
    return { totalSessions: 0, completedSessions: 0, thisWeek: 0, adherenceRate: 0 }
  }

  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay())
  weekStart.setHours(0, 0, 0, 0)

  const completed = sessions.filter((s) => !!s.completed_at)
  const thisWeek = sessions.filter(
    (s) => new Date(s.started_at) >= weekStart
  ).length

  return {
    totalSessions: sessions.length,
    completedSessions: completed.length,
    thisWeek,
    adherenceRate: sessions.length > 0 ? Math.round((completed.length / sessions.length) * 100) : 0,
  }
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export function TraineeLogsPage() {
  const { traineeId } = useParams<{ traineeId: string }>()
  const navigate = useNavigate()

  const userQ = useUser(traineeId)
  const sessionsQ = useWorkoutSessions(traineeId)

  const sessions = sessionsQ.data ?? []
  const adherence = getAdherence(sessionsQ.data)

  return (
    <div className="page-container">
      {/* Back + header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center w-10 h-10 rounded-lg text-text-secondary hover:text-text hover:bg-card transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" aria-hidden="true" />
        </button>
        {userQ.isLoading ? (
          <div className="flex items-center gap-2">
            <Skeleton className="w-9 h-9 rounded-full" />
            <Skeleton className="h-5 w-36" />
          </div>
        ) : (
          <div className="flex items-center gap-2 min-w-0">
            <Avatar src={userQ.data?.photo_url} name={userQ.data?.display_name} size="sm" />
            <h1 className="text-xl font-bold text-text truncate">
              {userQ.data?.display_name ?? 'Trainee'}&apos;s Logs
            </h1>
          </div>
        )}
      </div>

      {/* Error */}
      {sessionsQ.isError && (
        <ErrorState
          message="Could not load session logs."
          onRetry={() => sessionsQ.refetch()}
        />
      )}

      {/* Adherence stats */}
      {(sessionsQ.isLoading || sessions.length > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <StatCard
            label="Total Sessions"
            value={sessionsQ.isLoading ? null : adherence.totalSessions}
          />
          <StatCard
            label="Completed"
            value={sessionsQ.isLoading ? null : adherence.completedSessions}
          />
          <StatCard
            label="This Week"
            value={sessionsQ.isLoading ? null : adherence.thisWeek}
          />
          <StatCard
            label="Adherence"
            value={sessionsQ.isLoading ? null : adherence.adherenceRate}
            unit="%"
            highlight={adherence.adherenceRate >= 75}
          />
        </div>
      )}

      {/* Session history */}
      {sessionsQ.isLoading && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((k) => (
            <Card key={k}>
              <div className="flex items-center gap-3 mb-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-16 ml-auto" />
              </div>
              <Skeleton className="h-3 w-1/2" />
            </Card>
          ))}
        </div>
      )}

      {!sessionsQ.isLoading && !sessionsQ.isError && sessions.length === 0 && (
        <EmptyState
          icon={<Dumbbell className="w-7 h-7 text-text-tertiary" />}
          title="No sessions yet"
          description="This trainee hasn't logged any workouts yet."
        />
      )}

      {!sessionsQ.isLoading && sessions.length > 0 && (
        <div className="flex flex-col gap-3" role="list" aria-label="Session history">
          {sessions.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  unit = '',
  highlight = false,
}: {
  label: string
  value: number | null
  unit?: string
  highlight?: boolean
}) {
  return (
    <Card elevated className="flex flex-col items-center py-4 px-2 text-center">
      {value === null ? (
        <>
          <Skeleton className="h-7 w-12 mb-1" />
          <Skeleton className="h-3 w-16" />
        </>
      ) : (
        <>
          <p
            className="text-2xl font-bold"
            style={{ color: highlight ? colors.success : colors.primary }}
          >
            {value}{unit}
          </p>
          <p className="text-xs text-text-tertiary mt-0.5">{label}</p>
        </>
      )}
    </Card>
  )
}

// ─── SessionCard ──────────────────────────────────────────────────────────────

import type { WorkoutSession } from '../../types'

function SessionCard({ session }: { session: WorkoutSession }) {
  const isComplete = !!session.completed_at

  return (
    <Card role="listitem" className="flex flex-col gap-2">
      <div className="flex items-center gap-2 min-w-0">
        {/* Completion badge */}
        <span
          className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
            isComplete ? 'bg-success/20' : 'bg-warning/20'
          }`}
          aria-hidden="true"
        >
          {isComplete ? (
            <CheckCircle2 className="w-4 h-4 text-success" />
          ) : (
            <Clock className="w-4 h-4 text-warning" />
          )}
        </span>
        <span className="font-semibold text-text text-sm truncate flex-1 min-w-0">
          {formatDate(session.started_at)}
        </span>
        <span
          className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
            isComplete
              ? 'bg-success/15 text-success'
              : 'bg-warning/15 text-warning'
          }`}
        >
          {isComplete ? 'Done' : 'In progress'}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-tertiary pl-8">
        <span>{formatTime(session.started_at)}</span>
        <span>{durationMinutes(session.started_at, session.completed_at)}</span>
        {session.notes && (
          <span className="truncate max-w-[200px] italic">{session.notes}</span>
        )}
      </div>
    </Card>
  )
}
