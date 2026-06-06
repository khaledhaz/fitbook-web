import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import type { TrainerTemplate } from '../../types'

export const templateKeys = {
  all: (trainerId: string) => ['trainer_templates', trainerId] as const,
  one: (id: string) => ['trainer_template', id] as const,
}

export function useTrainerTemplates(trainerId: string | undefined) {
  return useQuery({
    queryKey: templateKeys.all(trainerId ?? ''),
    enabled: !!trainerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trainer_templates')
        .select('*')
        .eq('trainer_id', trainerId!)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as TrainerTemplate[]
    },
  })
}

export function useTrainerTemplate(id: string | undefined) {
  return useQuery({
    queryKey: templateKeys.one(id ?? ''),
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trainer_templates')
        .select('*, template_workout_plans(*), template_meal_plans(*)')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data
    },
  })
}

export function useCreateTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<TrainerTemplate> & { trainer_id: string; name: string; category: string }) => {
      const { data, error } = await supabase
        .from('trainer_templates')
        .insert({ is_active: true, times_used: 0, ...payload })
        .select()
        .single()
      if (error) throw error
      return data as TrainerTemplate
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: templateKeys.all(data.trainer_id) })
    },
  })
}

/** RPC: get_trainee_insights */
export function useTraineeInsights(traineeId: string | undefined, trainerId: string | undefined) {
  return useQuery({
    queryKey: ['trainee_insights', traineeId, trainerId],
    enabled: !!traineeId && !!trainerId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_trainee_insights', {
        p_trainee_id: traineeId,
        p_trainer_id: trainerId,
      })
      if (error) throw error
      return data
    },
  })
}
