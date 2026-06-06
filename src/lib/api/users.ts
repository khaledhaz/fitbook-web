import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import type { User, Trainer, Trainee, Vitals } from '../../types'

// ─── Keys ─────────────────────────────────────────────────────────────────────

export const userKeys = {
  all: ['users'] as const,
  byId: (id: string) => ['users', id] as const,
  trainer: (id: string) => ['trainers', id] as const,
  trainee: (id: string) => ['trainees', id] as const,
  vitals: (userId: string) => ['vitals', userId] as const,
  profile: (userId: string) => ['profile', userId] as const,
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useUser(userId: string | undefined) {
  return useQuery({
    queryKey: userKeys.byId(userId ?? ''),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId!)
        .single()
      if (error) throw error
      return data as User
    },
  })
}

export function useTrainer(userId: string | undefined) {
  return useQuery({
    queryKey: userKeys.trainer(userId ?? ''),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trainers')
        .select('*')
        .eq('id', userId!)
        .maybeSingle()
      if (error) throw error
      return data as Trainer | null
    },
  })
}

export function useTrainee(userId: string | undefined) {
  return useQuery({
    queryKey: userKeys.trainee(userId ?? ''),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trainees')
        .select('*')
        .eq('id', userId!)
        .maybeSingle()
      if (error) throw error
      return data as Trainee | null
    },
  })
}

export function useVitals(userId: string | undefined) {
  return useQuery({
    queryKey: userKeys.vitals(userId ?? ''),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vitals')
        .select('*')
        .eq('user_id', userId!)
        .maybeSingle()
      if (error) throw error
      return data as Vitals | null
    },
  })
}

/** RPC: get_user_profile — no extra params, uses auth.uid() server-side */
export function useUserProfile() {
  return useQuery({
    queryKey: ['user_profile'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_user_profile')
      if (error) throw error
      return data
    },
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<User> & { id: string }) => {
      const { id, ...rest } = payload
      const { data, error } = await supabase
        .from('users')
        .update(rest)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as User
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: userKeys.byId(data.id) })
      qc.invalidateQueries({ queryKey: ['user_profile'] })
    },
  })
}

/** RPC: update_user_profile — wraps display_name, photo_url, etc. */
export function useUpdateUserProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      display_name?: string
      photo_url?: string
      username?: string
      preferred_units?: string
    }) => {
      const { data, error } = await supabase.rpc('update_user_profile', payload)
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user_profile'] })
    },
  })
}

export function useUpsertVitals() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<Vitals> & { user_id: string }) => {
      const { data, error } = await supabase
        .from('vitals')
        .upsert(payload, { onConflict: 'user_id' })
        .select()
        .single()
      if (error) throw error
      return data as Vitals
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: userKeys.vitals(data.user_id) })
    },
  })
}

/** Trainer's list of trainees */
export function useTrainerTrainees(trainerId: string | undefined) {
  return useQuery({
    queryKey: ['trainer_trainees', trainerId],
    enabled: !!trainerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trainees')
        .select('*, users!inner(*)')
        .eq('trainer_id', trainerId!)
      if (error) throw error
      return data as (Trainee & { users: User })[]
    },
  })
}

/** RPC: search_trainees */
export function useSearchTrainees() {
  return useMutation({
    mutationFn: async (searchTerm: string) => {
      const { data, error } = await supabase.rpc('search_trainees', {
        search_term: searchTerm,
      })
      if (error) throw error
      return data
    },
  })
}

/** RPC: get_trainer_dashboard */
export function useTrainerDashboard(trainerId: string | undefined) {
  return useQuery({
    queryKey: ['trainer_dashboard', trainerId],
    enabled: !!trainerId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_trainer_dashboard', {
        p_trainer_id: trainerId,
      })
      if (error) throw error
      return data
    },
  })
}
