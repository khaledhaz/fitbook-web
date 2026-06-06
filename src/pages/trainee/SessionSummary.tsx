import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, Dumbbell, Trophy, Clock, BarChart2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useSessionSets } from '../../lib/api/workouts'
import { Card, CardHeader, CardTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { PageSpinner, Skeleton } from '../../components/ui/Spinner'
import { ErrorState } from '../../components/ui/States'
import { colors } from '../../theme'
import type { WorkoutSession, WorkoutDayExercise, Exercise, WorkoutSessionSet } from '../../types'

// ─── Hook: fetch session with day + exercises ─────────────────────────────────

function useSessionDetail(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['session_detail', sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workout_sessions')
        .select('*, workout_days(*, workout_day_exercises(*, exercises(*)))')
        .eq('id', sessionId!)
        .single()
      if (error) throw error
      return data as WorkoutSession & {
        workout_days: (import('../../types').WorkoutDay & {
          workout_day_exercises: (WorkoutDayExercise & { exercises: Exercise })[]
        }) | null
      }
    },
  })
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function TraineeSessionSummaryPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()

  const sessionQ = useSessionDetail(sessionId)
  const setsQ = useSessionSets(sessionId)

  if (sessionQ.isLoading || setsQ.isLoading) return <PageSpinner />

  if (sessionQ.isError || setsQ.isError) {
    return (
      <div className="page-container">
        <ErrorState
          message="Could not load session summary."
          onRetry={() => {
            sessionQ.refetch()
            setsQ.refetch()
          }}
        />
      </div>
    )
  }

  const session = sessionQ.data
  if (!session) {
    return (
      <div className="page-container">
        <ErrorState title="Session not found" message="This session does not exist." />
      </div>
    )
  }

  const sets = setsQ.data ?? []
  const exercises = session.workout_days?.workout_day_exercises ?? []

  // Compute stats
  const completedSets = sets.filter((s) => s.is_completed)
  const totalVolume = completedSets.reduce(
    (sum, s) => sum + (s.weight ?? 0) * (s.reps ?? 0),
    0
  )
  const duration = session.completed_at
    ? Math.round(
        (new Date(session.completed_at).getTime() - new Date(session.started_at).getTime()) / 60000
      )
    : null

  return (
    <div className="page-container max-w-2xl mx-auto">
      {/* Hero header */}
      <div className="text-center mb-8">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: `${colors.success}20` }}
        >
          <Trophy className="w-8 h-8" style={{ color: colors.success }} aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-text">Session Complete!</h1>
        {session.workout_days?.title && (
          <p className="text-text-secondary mt-1">{session.workout_days.title}</p>
        )}
        <p className="text-xs text-text-tertiary mt-1">
          {new Date(session.started_at).toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Stats row */}
      <Card elevated className="mb-6">
        <div className="grid grid-cols-3 gap-4">
          <StatItem
            label="Sets Done"
            value={`${completedSets.length}/${sets.length}`}
            icon={<CheckCircle2 className="w-5 h-5" style={{ color: colors.success }} />}
          />
          <StatItem
            label="Volume"
            value={totalVolume > 0 ? `${Math.round(totalVolume).toLocaleString()}` : '—'}
            sub="kg"
            icon={<BarChart2 className="w-5 h-5 text-primary" />}
          />
          <StatItem
            label="Duration"
            value={duration != null ? `${duration}` : '—'}
            sub="min"
            icon={<Clock className="w-5 h-5 text-text-secondary" />}
          />
        </div>
      </Card>

      {/* Per-exercise breakdown */}
      {exercises.length > 0 && (
        <div className="mb-6">
          <h2 className="text-base font-semibold text-text mb-3">Exercise Breakdown</h2>
          <div className="flex flex-col gap-3">
            {exercises.map((ex) => {
              const exSets = sets.filter((s) => s.workout_day_exercise_id === ex.id)
              const exCompleted = exSets.filter((s) => s.is_completed)
              const exVolume = exCompleted.reduce(
                (sum, s) => sum + (s.weight ?? 0) * (s.reps ?? 0),
                0
              )
              return (
                <Card key={ex.id} padding="sm">
                  <div className="flex items-start gap-3">
                    <Dumbbell className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text truncate">
                        {ex.custom_name ?? ex.exercises?.name ?? 'Exercise'}
                      </p>
                      <p className="text-xs text-text-tertiary mt-0.5">
                        {exCompleted.length}/{exSets.length} sets
                        {exVolume > 0 && ` · ${Math.round(exVolume).toLocaleString()} kg`}
                      </p>
                    </div>
                  </div>

                  {exSets.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-divider">
                      <div className="grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-2 text-xs text-text-tertiary mb-2 px-1">
                        <span className="w-8">Set</span>
                        <span>Weight</span>
                        <span>Reps</span>
                        <span>RPE</span>
                        <span className="w-8" />
                      </div>
                      {exSets.map((s) => (
                        <SetSummaryRow key={s.id} set={s} />
                      ))}
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Notes */}
      {session.notes && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <p className="text-sm text-text-secondary">{session.notes}</p>
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3">
        <Button fullWidth onClick={() => navigate('/home')}>
          Back to Home
        </Button>
        <Button fullWidth variant="secondary" onClick={() => navigate('/progress')}>
          View Progress
        </Button>
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatItem({
  label,
  value,
  sub,
  icon,
}: {
  label: string
  value: string
  sub?: string
  icon: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center text-center gap-1">
      <div className="mb-1" aria-hidden="true">{icon}</div>
      <p className="text-lg font-bold text-text leading-tight">
        {value}
        {sub && <span className="text-xs text-text-tertiary ml-0.5">{sub}</span>}
      </p>
      <p className="text-xs text-text-tertiary">{label}</p>
    </div>
  )
}

function SetSummaryRow({ set }: { set: WorkoutSessionSet }) {
  return (
    <div className="grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-2 items-center text-sm py-1">
      <span className="w-8 text-xs text-text-tertiary text-center">{set.set_index + 1}</span>
      <span className="text-text text-center">{set.weight != null ? `${set.weight}` : '—'}</span>
      <span className="text-text text-center">{set.reps != null ? set.reps : '—'}</span>
      <span className="text-text text-center">{set.rpe != null ? set.rpe : '—'}</span>
      <div className="w-8 flex justify-center">
        {set.is_completed ? (
          <CheckCircle2 className="w-4 h-4" style={{ color: colors.success }} aria-label="Completed" />
        ) : (
          <span className="w-4 h-4 rounded-full border border-border inline-block" aria-label="Not completed" />
        )}
      </div>
    </div>
  )
}
