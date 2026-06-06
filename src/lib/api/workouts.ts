import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import type {
  WorkoutPlan,
  WorkoutDay,
  WorkoutDayExercise,
  WorkoutSession,
  WorkoutSessionSet,
  Exercise,
} from '../../types'

// ─── Keys ─────────────────────────────────────────────────────────────────────

export const workoutKeys = {
  plans: (traineeId: string) => ['workout_plans', traineeId] as const,
  plan: (planId: string) => ['workout_plan', planId] as const,
  days: (planId: string) => ['workout_days', planId] as const,
  day: (dayId: string) => ['workout_day', dayId] as const,
  exercises: (dayId: string) => ['workout_day_exercises', dayId] as const,
  sessions: (traineeId: string) => ['workout_sessions', traineeId] as const,
  session: (sessionId: string) => ['workout_session', sessionId] as const,
  sets: (sessionId: string) => ['workout_session_sets', sessionId] as const,
  exerciseLib: ['exercises'] as const,
  exerciseById: (id: string) => ['exercise', id] as const,
}

// ─── Plans ────────────────────────────────────────────────────────────────────

export function useWorkoutPlans(traineeId: string | undefined) {
  return useQuery({
    queryKey: workoutKeys.plans(traineeId ?? ''),
    enabled: !!traineeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workout_plans')
        .select('*')
        .eq('trainee_id', traineeId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as WorkoutPlan[]
    },
  })
}

export function useWorkoutPlan(planId: string | undefined) {
  return useQuery({
    queryKey: workoutKeys.plan(planId ?? ''),
    enabled: !!planId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workout_plans')
        .select('*')
        .eq('id', planId!)
        .single()
      if (error) throw error
      return data as WorkoutPlan
    },
  })
}

export function useCreateWorkoutPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<WorkoutPlan> & { trainee_id: string; title: string }) => {
      const { data, error } = await supabase
        .from('workout_plans')
        .insert(payload)
        .select()
        .single()
      if (error) throw error
      return data as WorkoutPlan
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: workoutKeys.plans(data.trainee_id) })
    },
  })
}

export function useUpdateWorkoutPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<WorkoutPlan> & { id: string }) => {
      const { id, ...rest } = payload
      const { data, error } = await supabase
        .from('workout_plans')
        .update(rest)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as WorkoutPlan
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: workoutKeys.plan(data.id) })
      qc.invalidateQueries({ queryKey: workoutKeys.plans(data.trainee_id) })
    },
  })
}

export function useDeleteWorkoutPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, traineeId }: { id: string; traineeId: string }) => {
      const { error } = await supabase.from('workout_plans').delete().eq('id', id)
      if (error) throw error
      return { id, traineeId }
    },
    onSuccess: ({ traineeId }) => {
      qc.invalidateQueries({ queryKey: workoutKeys.plans(traineeId) })
    },
  })
}

// ─── Days ─────────────────────────────────────────────────────────────────────

export function useWorkoutDays(planId: string | undefined) {
  return useQuery({
    queryKey: workoutKeys.days(planId ?? ''),
    enabled: !!planId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workout_days')
        .select('*')
        .eq('workout_plan_id', planId!)
        .order('day_index', { ascending: true })
      if (error) throw error
      return data as WorkoutDay[]
    },
  })
}

export function useCreateWorkoutDay() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<WorkoutDay> & { workout_plan_id: string; day_index: number }) => {
      const { data, error } = await supabase
        .from('workout_days')
        .insert(payload)
        .select()
        .single()
      if (error) throw error
      return data as WorkoutDay
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: workoutKeys.days(data.workout_plan_id) })
    },
  })
}

export function useUpdateWorkoutDay() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<WorkoutDay> & { id: string }) => {
      const { id, ...rest } = payload
      const { data, error } = await supabase
        .from('workout_days')
        .update(rest)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as WorkoutDay
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: workoutKeys.days(data.workout_plan_id) })
    },
  })
}

export function useDeleteWorkoutDay() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, planId }: { id: string; planId: string }) => {
      const { error } = await supabase.from('workout_days').delete().eq('id', id)
      if (error) throw error
      return { planId }
    },
    onSuccess: ({ planId }) => {
      qc.invalidateQueries({ queryKey: workoutKeys.days(planId) })
    },
  })
}

// ─── Day exercises ─────────────────────────────────────────────────────────────

export function useWorkoutDayExercises(dayId: string | undefined) {
  return useQuery({
    queryKey: workoutKeys.exercises(dayId ?? ''),
    enabled: !!dayId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workout_day_exercises')
        .select('*, exercises(*)')
        .eq('workout_day_id', dayId!)
        .order('exercise_order', { ascending: true })
      if (error) throw error
      return data as (WorkoutDayExercise & { exercises: Exercise })[]
    },
  })
}

export function useCreateWorkoutDayExercise() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (
      payload: Partial<WorkoutDayExercise> & { workout_day_id: string; exercise_id: string; sets: number; exercise_order: number }
    ) => {
      const { data, error } = await supabase
        .from('workout_day_exercises')
        .insert(payload)
        .select()
        .single()
      if (error) throw error
      return data as WorkoutDayExercise
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: workoutKeys.exercises(data.workout_day_id) })
    },
  })
}

export function useUpdateWorkoutDayExercise() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<WorkoutDayExercise> & { id: string }) => {
      const { id, ...rest } = payload
      const { data, error } = await supabase
        .from('workout_day_exercises')
        .update(rest)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as WorkoutDayExercise
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: workoutKeys.exercises(data.workout_day_id) })
    },
  })
}

export function useDeleteWorkoutDayExercise() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, dayId }: { id: string; dayId: string }) => {
      const { error } = await supabase.from('workout_day_exercises').delete().eq('id', id)
      if (error) throw error
      return { dayId }
    },
    onSuccess: ({ dayId }) => {
      qc.invalidateQueries({ queryKey: workoutKeys.exercises(dayId) })
    },
  })
}

/** RPC: bulk_reorder_exercises */
export function useBulkReorderExercises() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ dayId, orders }: { dayId: string; orders: { id: string; exercise_order: number }[] }) => {
      const { data, error } = await supabase.rpc('bulk_reorder_exercises', {
        p_workout_day_id: dayId,
        p_orders: orders,
      })
      if (error) throw error
      return data
    },
    onSuccess: (_data, { dayId }) => {
      qc.invalidateQueries({ queryKey: workoutKeys.exercises(dayId) })
    },
  })
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

export function useWorkoutSessions(traineeId: string | undefined) {
  return useQuery({
    queryKey: workoutKeys.sessions(traineeId ?? ''),
    enabled: !!traineeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('trainee_id', traineeId!)
        .order('started_at', { ascending: false })
      if (error) throw error
      return data as WorkoutSession[]
    },
  })
}

export function useTodayWorkoutSession(traineeId: string | undefined) {
  return useQuery({
    queryKey: ['today_session', traineeId],
    enabled: !!traineeId,
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('workout_sessions')
        .select('*, workout_days(*)')
        .eq('trainee_id', traineeId!)
        .gte('started_at', `${today}T00:00:00`)
        .lte('started_at', `${today}T23:59:59`)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data as (WorkoutSession & { workout_days: WorkoutDay | null }) | null
    },
  })
}

export function useCreateWorkoutSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (
      payload: Partial<WorkoutSession> & { trainee_id: string; started_at: string }
    ) => {
      const { data, error } = await supabase
        .from('workout_sessions')
        .insert(payload)
        .select()
        .single()
      if (error) throw error
      return data as WorkoutSession
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: workoutKeys.sessions(data.trainee_id) })
      qc.invalidateQueries({ queryKey: ['today_session', data.trainee_id] })
    },
  })
}

export function useCompleteWorkoutSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, traineeId }: { id: string; traineeId: string }) => {
      const { data, error } = await supabase
        .from('workout_sessions')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return { ...data as WorkoutSession, traineeId }
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: workoutKeys.sessions(data.traineeId) })
      qc.invalidateQueries({ queryKey: workoutKeys.session(data.id) })
    },
  })
}

// ─── Session sets ─────────────────────────────────────────────────────────────

export function useSessionSets(sessionId: string | undefined) {
  return useQuery({
    queryKey: workoutKeys.sets(sessionId ?? ''),
    enabled: !!sessionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workout_session_sets')
        .select('*')
        .eq('session_id', sessionId!)
        .order('set_index', { ascending: true })
      if (error) throw error
      return data as WorkoutSessionSet[]
    },
  })
}

export function useUpsertSessionSet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<WorkoutSessionSet> & { session_id: string; workout_day_exercise_id: string; set_index: number }) => {
      const { data, error } = await supabase
        .from('workout_session_sets')
        .upsert(payload, { onConflict: 'session_id,workout_day_exercise_id,set_index' })
        .select()
        .single()
      if (error) throw error
      return data as WorkoutSessionSet
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: workoutKeys.sets(data.session_id) })
    },
  })
}

// ─── Exercise library ─────────────────────────────────────────────────────────

export function useExercises(search?: string) {
  return useQuery({
    queryKey: [...workoutKeys.exerciseLib, search],
    queryFn: async () => {
      let query = supabase.from('exercises').select('*').limit(50)
      if (search) query = query.ilike('name', `%${search}%`)
      const { data, error } = await query
      if (error) throw error
      return data as Exercise[]
    },
  })
}

export function useExercise(id: string | undefined) {
  return useQuery({
    queryKey: workoutKeys.exerciseById(id ?? ''),
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as Exercise
    },
  })
}

/** RPC: get_trainee_exercise_progress — uses target_trainee_id (no p_ prefix!) */
export function useTraineeExerciseProgress(traineeId: string | undefined) {
  return useQuery({
    queryKey: ['trainee_exercise_progress', traineeId],
    enabled: !!traineeId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_trainee_exercise_progress', {
        target_trainee_id: traineeId,
      })
      if (error) throw error
      return data
    },
  })
}

/** RPC: save_plan_as_template */
export function useSavePlanAsTemplate() {
  return useMutation({
    mutationFn: async (params: {
      workout_plan_id: string
      trainer_id: string
      name: string
      category?: string
      description?: string
      tags?: string[]
    }) => {
      const { data, error } = await supabase.rpc('save_plan_as_template', {
        p_workout_plan_id: params.workout_plan_id,
        p_trainer_id: params.trainer_id,
        p_template_name: params.name,
        p_category: params.category ?? 'general',
        p_description: params.description ?? null,
        p_tags: params.tags ?? [],
      })
      if (error) throw error
      return data
    },
  })
}

/** RPC: apply_template_to_trainee */
export function useApplyWorkoutTemplate() {
  return useMutation({
    mutationFn: async (params: {
      template_id: string
      trainee_id: string
      starts_on?: string
    }) => {
      const { data, error } = await supabase.rpc('apply_template_to_trainee', {
        p_template_id: params.template_id,
        p_trainee_id: params.trainee_id,
        p_starts_on: params.starts_on ?? new Date().toISOString(),
      })
      if (error) throw error
      return data
    },
  })
}
