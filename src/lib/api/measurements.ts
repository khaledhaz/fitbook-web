import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import type { BodyMeasurement } from '../../types'

export const measurementKeys = {
  all: (userId: string) => ['body_measurements', userId] as const,
}

export function useBodyMeasurements(userId: string | undefined) {
  return useQuery({
    queryKey: measurementKeys.all(userId ?? ''),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('body_measurements')
        .select('*')
        .eq('user_id', userId!)
        .order('measured_at', { ascending: false })
      if (error) throw error
      return data as BodyMeasurement[]
    },
  })
}

export function useAddBodyMeasurement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<BodyMeasurement> & { user_id: string; measured_at: string }) => {
      const { data, error } = await supabase
        .from('body_measurements')
        .insert(payload)
        .select()
        .single()
      if (error) throw error
      return data as BodyMeasurement
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: measurementKeys.all(data.user_id) })
    },
  })
}

export function useUpdateBodyMeasurement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<BodyMeasurement> & { id: string; user_id: string }) => {
      const { id, ...rest } = payload
      const { data, error } = await supabase
        .from('body_measurements')
        .update(rest)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as BodyMeasurement
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: measurementKeys.all(data.user_id) })
    },
  })
}
