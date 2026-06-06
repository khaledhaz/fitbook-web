import React, { useState, useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Timer, X } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { supabase } from '../../lib/supabase'
import {
  useWorkoutDayExercises,
  useCreateWorkoutSession,
  useCompleteWorkoutSession,
  useSessionSets,
  useUpsertSessionSet,
} from '../../lib/api/workouts'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { PageSpinner, Skeleton } from '../../components/ui/Spinner'
import { ErrorState } from '../../components/ui/States'
import { useToast } from '../../components/ui/Toast'
import { colors } from '../../theme'
import type { WorkoutDayExercise, Exercise, WorkoutSessionSet } from '../../types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SetDraft {
  weight: string
  reps: string
  rpe: string
  is_completed: boolean
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function TraineeWorkoutSessionPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { toast } = useToast()
  const qc = useQueryClient()

  const dayId = searchParams.get('dayId') ?? undefined
  const existingSessionId = searchParams.get('sessionId') ?? undefined

  // Data hooks
  const exercisesQ = useWorkoutDayExercises(dayId)
  const createSession = useCreateWorkoutSession()
  const completeSession = useCompleteWorkoutSession()
  const upsertSet = useUpsertSessionSet()

  // Session state
  const [sessionId, setSessionId] = useState<string | null>(existingSessionId ?? null)
  const [sessionStarted, setSessionStarted] = useState(!!existingSessionId)
  const [completing, setCompleting] = useState(false)

  // Start timer
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!sessionStarted) return
    const t = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(t)
  }, [sessionStarted])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  // Sets from DB (when session exists)
  const setsQ = useSessionSets(sessionId ?? undefined)
  const dbSets = setsQ.data ?? []

  // Local drafts — keyed by `${exerciseId}:${setIndex}`
  const [drafts, setDrafts] = useState<Record<string, SetDraft>>({})

  // Initialise drafts from DB when sets load
  useEffect(() => {
    if (!dbSets.length) return
    setDrafts((prev) => {
      const next = { ...prev }
      dbSets.forEach((s) => {
        const key = `${s.workout_day_exercise_id}:${s.set_index}`
        if (!next[key]) {
          next[key] = {
            weight: s.weight?.toString() ?? '',
            reps: s.reps?.toString() ?? '',
            rpe: s.rpe?.toString() ?? '',
            is_completed: s.is_completed,
          }
        }
      })
      return next
    })
  }, [dbSets])

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const handleStartSession = async () => {
    if (!user?.id || !dayId) return
    try {
      // Fetch workout_plan_id from workout_days (NOT NULL constraint requires it)
      const { data: dayRow, error: dayErr } = await supabase
        .from('workout_days')
        .select('workout_plan_id')
        .eq('id', dayId)
        .single()
      if (dayErr) throw dayErr
      const session = await createSession.mutateAsync({
        trainee_id: user.id,
        workout_plan_id: dayRow.workout_plan_id,
        workout_day_id: dayId,
        started_at: new Date().toISOString(),
      })
      setSessionId(session.id)
      setSessionStarted(true)
    } catch (e) {
      toast((e as Error).message ?? 'Failed to start session', 'error')
    }
  }

  const updateDraft = useCallback(
    (exerciseId: string, setIndex: number, field: keyof SetDraft, value: string | boolean) => {
      const key = `${exerciseId}:${setIndex}`
      setDrafts((prev) => ({
        ...prev,
        [key]: { ...(prev[key] ?? { weight: '', reps: '', rpe: '', is_completed: false }), [field]: value },
      }))
    },
    []
  )

  const saveSet = useCallback(
    async (exerciseId: string, setIndex: number) => {
      if (!sessionId) return
      const key = `${exerciseId}:${setIndex}`
      const d = drafts[key]
      if (!d) return
      try {
        await upsertSet.mutateAsync({
          session_id: sessionId,
          workout_day_exercise_id: exerciseId,
          set_index: setIndex,
          weight: d.weight ? parseFloat(d.weight) : null,
          reps: d.reps ? parseInt(d.reps, 10) : null,
          rpe: d.rpe ? parseFloat(d.rpe) : null,
          is_completed: d.is_completed,
          completed_at: d.is_completed ? new Date().toISOString() : null,
        })
      } catch {
        // silent — optimistic UI already updated
      }
    },
    [sessionId, drafts, upsertSet]
  )

  const toggleSetComplete = useCallback(
    async (exerciseId: string, setIndex: number) => {
      const key = `${exerciseId}:${setIndex}`
      const current = drafts[key]?.is_completed ?? false
      updateDraft(exerciseId, setIndex, 'is_completed', !current)
      // save immediately
      if (sessionId) {
        const d = drafts[key] ?? { weight: '', reps: '', rpe: '', is_completed: false }
        try {
          await upsertSet.mutateAsync({
            session_id: sessionId,
            workout_day_exercise_id: exerciseId,
            set_index: setIndex,
            weight: d.weight ? parseFloat(d.weight) : null,
            reps: d.reps ? parseInt(d.reps, 10) : null,
            rpe: d.rpe ? parseFloat(d.rpe) : null,
            is_completed: !current,
            completed_at: !current ? new Date().toISOString() : null,
          })
        } catch {
          // revert
          updateDraft(exerciseId, setIndex, 'is_completed', current)
        }
      }
    },
    [drafts, sessionId, upsertSet, updateDraft]
  )

  const handleCompleteSession = async () => {
    if (!sessionId || !user?.id) return
    setCompleting(true)
    try {
      await completeSession.mutateAsync({ id: sessionId, traineeId: user.id })
      navigate(`/workout/session-summary/${sessionId}`, { replace: true })
    } catch (e) {
      toast((e as Error).message ?? 'Failed to complete session', 'error')
      setCompleting(false)
    }
  }

  // ─── Loading / error ─────────────────────────────────────────────────────────

  if (!dayId) {
    return (
      <div className="page-container">
        <ErrorState
          title="No workout day selected"
          message="Go back and select a workout day to start."
          onRetry={() => navigate(-1)}
        />
      </div>
    )
  }

  if (exercisesQ.isLoading) return <PageSpinner />

  if (exercisesQ.isError) {
    return (
      <div className="page-container">
        <ErrorState
          message="Could not load exercises."
          onRetry={() => exercisesQ.refetch()}
        />
      </div>
    )
  }

  const exercises = exercisesQ.data ?? []

  return (
    <div className="page-container max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-text">Workout Session</h1>
          {sessionStarted && (
            <p className="text-sm text-text-secondary flex items-center gap-1 mt-0.5">
              <Timer className="w-4 h-4" aria-hidden="true" />
              <span aria-live="polite" aria-label={`Elapsed time: ${formatTime(elapsed)}`}>
                {formatTime(elapsed)}
              </span>
            </p>
          )}
        </div>
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-card-elevated text-text-tertiary hover:text-text transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Go back"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Start session prompt */}
      {!sessionStarted && (
        <div className="mb-6">
          <Button
            fullWidth
            size="lg"
            isLoading={createSession.isPending}
            onClick={handleStartSession}
          >
            Start Session
          </Button>
        </div>
      )}

      {/* Exercise list */}
      {exercises.length === 0 ? (
        <p className="text-text-secondary text-sm text-center py-8">No exercises in this day.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {exercises.map((ex) => (
            <ExerciseCard
              key={ex.id}
              ex={ex}
              sessionActive={sessionStarted}
              drafts={drafts}
              onUpdateDraft={updateDraft}
              onSaveSet={saveSet}
              onToggleComplete={toggleSetComplete}
            />
          ))}
        </div>
      )}

      {/* Complete session */}
      {sessionStarted && (
        <div className="mt-8">
          <Button
            fullWidth
            size="lg"
            variant="primary"
            isLoading={completing}
            onClick={handleCompleteSession}
          >
            Complete Workout
          </Button>
        </div>
      )}
    </div>
  )
}

// ─── Exercise card ────────────────────────────────────────────────────────────

interface ExerciseCardProps {
  ex: WorkoutDayExercise & { exercises: Exercise }
  sessionActive: boolean
  drafts: Record<string, SetDraft>
  onUpdateDraft: (exerciseId: string, setIndex: number, field: keyof SetDraft, value: string | boolean) => void
  onSaveSet: (exerciseId: string, setIndex: number) => Promise<void>
  onToggleComplete: (exerciseId: string, setIndex: number) => Promise<void>
}

function ExerciseCard({
  ex,
  sessionActive,
  drafts,
  onUpdateDraft,
  onSaveSet,
  onToggleComplete,
}: ExerciseCardProps) {
  const [collapsed, setCollapsed] = useState(false)
  const name = ex.custom_name ?? ex.exercises?.name ?? 'Exercise'
  const setCount = ex.sets ?? 3
  const setIndices = Array.from({ length: setCount }, (_, i) => i)

  // Count completed sets
  const completedCount = setIndices.filter(
    (i) => drafts[`${ex.id}:${i}`]?.is_completed
  ).length

  return (
    <Card>
      <button
        className="w-full text-left flex items-center gap-3 min-h-[44px]"
        onClick={() => setCollapsed((c) => !c)}
        aria-expanded={!collapsed}
        aria-controls={`sets-${ex.id}`}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text truncate">{name}</p>
          <p className="text-xs text-text-tertiary">
            {completedCount}/{setCount} sets completed
          </p>
        </div>
        {collapsed ? (
          <ChevronDown className="w-4 h-4 text-text-tertiary flex-shrink-0" aria-hidden="true" />
        ) : (
          <ChevronUp className="w-4 h-4 text-text-tertiary flex-shrink-0" aria-hidden="true" />
        )}
      </button>

      {!collapsed && (
        <div id={`sets-${ex.id}`} className="mt-4">
          {/* Column headers */}
          <div className="grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-2 text-xs text-text-tertiary mb-2 px-1">
            <span className="w-8">Set</span>
            <span>Weight</span>
            <span>Reps</span>
            <span>RPE</span>
            <span className="w-8 text-center">Done</span>
          </div>

          <div className="flex flex-col gap-2">
            {setIndices.map((i) => (
              <SetRow
                key={i}
                exerciseId={ex.id}
                setIndex={i}
                draft={drafts[`${ex.id}:${i}`] ?? { weight: '', reps: '', rpe: '', is_completed: false }}
                sessionActive={sessionActive}
                onUpdate={(field, value) => onUpdateDraft(ex.id, i, field, value)}
                onBlur={() => onSaveSet(ex.id, i)}
                onToggleComplete={() => onToggleComplete(ex.id, i)}
              />
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}

// ─── Set row ──────────────────────────────────────────────────────────────────

interface SetRowProps {
  exerciseId: string
  setIndex: number
  draft: SetDraft
  sessionActive: boolean
  onUpdate: (field: keyof SetDraft, value: string | boolean) => void
  onBlur: () => void
  onToggleComplete: () => void
}

function SetRow({ setIndex, draft, sessionActive, onUpdate, onBlur, onToggleComplete }: SetRowProps) {
  const isDisabled = !sessionActive

  return (
    <div
      className="grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-2 items-center"
      style={draft.is_completed ? { opacity: 0.75 } : undefined}
    >
      {/* Set number */}
      <span className="w-8 text-xs text-text-tertiary text-center">{setIndex + 1}</span>

      {/* Weight */}
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step={0.5}
        value={draft.weight}
        onChange={(e) => onUpdate('weight', e.target.value)}
        onBlur={onBlur}
        disabled={isDisabled}
        placeholder="kg"
        aria-label={`Set ${setIndex + 1} weight`}
        className="h-10 w-full bg-input-bg border border-border rounded-md px-2 text-sm text-text text-center
          focus:outline-none focus:border-primary disabled:opacity-40 disabled:cursor-not-allowed"
      />

      {/* Reps */}
      <input
        type="number"
        inputMode="numeric"
        min={0}
        value={draft.reps}
        onChange={(e) => onUpdate('reps', e.target.value)}
        onBlur={onBlur}
        disabled={isDisabled}
        placeholder="reps"
        aria-label={`Set ${setIndex + 1} reps`}
        className="h-10 w-full bg-input-bg border border-border rounded-md px-2 text-sm text-text text-center
          focus:outline-none focus:border-primary disabled:opacity-40 disabled:cursor-not-allowed"
      />

      {/* RPE */}
      <input
        type="number"
        inputMode="decimal"
        min={1}
        max={10}
        step={0.5}
        value={draft.rpe}
        onChange={(e) => onUpdate('rpe', e.target.value)}
        onBlur={onBlur}
        disabled={isDisabled}
        placeholder="RPE"
        aria-label={`Set ${setIndex + 1} RPE`}
        className="h-10 w-full bg-input-bg border border-border rounded-md px-2 text-sm text-text text-center
          focus:outline-none focus:border-primary disabled:opacity-40 disabled:cursor-not-allowed"
      />

      {/* Completed toggle */}
      <button
        onClick={onToggleComplete}
        disabled={isDisabled}
        className="w-8 h-8 flex items-center justify-center rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label={draft.is_completed ? `Mark set ${setIndex + 1} incomplete` : `Mark set ${setIndex + 1} complete`}
        aria-pressed={draft.is_completed}
      >
        {draft.is_completed ? (
          <CheckCircle2 className="w-5 h-5" style={{ color: colors.success }} />
        ) : (
          <Circle className="w-5 h-5 text-text-tertiary" />
        )}
      </button>
    </div>
  )
}
