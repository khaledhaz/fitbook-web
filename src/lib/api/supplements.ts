import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import type { SupplementPlan, SupplementItem } from '../../types'

export const suppKeys = {
  plan: (traineeId: string) => ['supplement_plan', traineeId] as const,
  items: (planId: string) => ['supplement_items', planId] as const,
}

/** RPC: get_supplement_plan — param: p_trainee_id */
export function useSupplementPlan(traineeId: string | undefined) {
  return useQuery({
    queryKey: suppKeys.plan(traineeId ?? ''),
    enabled: !!traineeId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_supplement_plan', {
        p_trainee_id: traineeId,
      })
      if (error) throw error
      return data as { plan: SupplementPlan; items: SupplementItem[] } | null
    },
  })
}

export function useSupplementItems(planId: string | undefined) {
  return useQuery({
    queryKey: suppKeys.items(planId ?? ''),
    enabled: !!planId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplement_items')
        .select('*')
        .eq('plan_id', planId!)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
      if (error) throw error
      return data as SupplementItem[]
    },
  })
}

/** RPC: upsert_supplement_item — param: p_data */
export function useUpsertSupplementItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (itemData: Partial<SupplementItem> & { plan_id: string; type: string }) => {
      const { data, error } = await supabase.rpc('upsert_supplement_item', {
        p_data: itemData,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['supplement_plan'] })
    },
  })
}

/** RPC: delete_supplement_item — param: p_item_id */
export function useDeleteSupplementItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (itemId: string) => {
      const { data, error } = await supabase.rpc('delete_supplement_item', {
        p_item_id: itemId,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['supplement_plan'] })
    },
  })
}
