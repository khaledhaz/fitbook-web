/**
 * Trainer-feature-local hooks.
 * These do NOT belong in src/lib/api/ (they are page-scoped or RPC wrappers
 * not needed by other roles).
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import type { WorkoutSession, Trainer } from '../../../types'

// ─── Trainer insights RPC ──────────────────────────────────────────────────────

/** Shape returned by get_trainee_insights RPC */
export interface TraineeInsightsData {
  compliance: {
    sessions_this_week: number
    prescribed_days: number
    total_sessions: number
    total_sets_completed: number
    compliance_rate: number
  } | null
  volume_trend: Array<{
    week_start: string
    total_volume: number
    session_count: number
  }>
  recent_sessions: Array<{
    session_id: string
    started_at: string
    completed_at: string | null
    day_title: string | null
    total_sets: number
    completed_sets: number
  }>
  top_exercises: Array<{
    exercise_name: string
    best_weight: number | null
    total_sets: number
  }>
}

export function useTraineeInsights(traineeId: string | undefined) {
  return useQuery({
    queryKey: ['trainee_insights', traineeId],
    enabled: !!traineeId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_trainee_insights', {
        p_trainee_id: traineeId,
      })
      if (error) throw error
      return data as TraineeInsightsData
    },
  })
}

// ─── Trainer profile update (bio + portfolio) ──────────────────────────────────

export function useUpdateTrainerProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      trainerId: string
      bio?: string | null
      portfolio_url?: string | null
    }) => {
      const { trainerId, ...rest } = payload
      const { data, error } = await supabase
        .from('trainers')
        .update(rest)
        .eq('id', trainerId)
        .select()
        .single()
      if (error) throw error
      return data as Trainer
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['trainers', vars.trainerId] })
    },
  })
}

// ─── Trainee workout sessions for logs view ────────────────────────────────────

export interface TraineeSessionLog {
  id: string
  started_at: string
  completed_at: string | null
  notes: string | null
  workout_day_title: string | null
  sets_total: number
  sets_completed: number
}

export function useTraineeSessions(traineeId: string | undefined) {
  return useQuery({
    queryKey: ['trainee_sessions', traineeId],
    enabled: !!traineeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workout_sessions')
        .select('*, workout_days(title)')
        .eq('trainee_id', traineeId!)
        .order('started_at', { ascending: false })
        .limit(50)
      if (error) throw error
      // Flatten to a cleaner shape
      return (data as Array<WorkoutSession & { workout_days: { title: string | null } | null }>).map(
        (s) => ({
          id: s.id,
          started_at: s.started_at,
          completed_at: s.completed_at,
          notes: s.notes,
          workout_day_title: s.workout_days?.title ?? null,
          sets_total: 0,
          sets_completed: 0,
        }) satisfies TraineeSessionLog
      )
    },
  })
}
