import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import type {
  MealPlan,
  Meal,
  MealVariation,
  MealVariationItem,
  TraineeMealSelection,
} from '../../types'

// ─── Keys ─────────────────────────────────────────────────────────────────────

export const mealKeys = {
  plans: (traineeId: string) => ['meal_plans', traineeId] as const,
  plan: (planId: string) => ['meal_plan', planId] as const,
  meals: (planId: string) => ['meals', planId] as const,
  meal: (mealId: string) => ['meal', mealId] as const,
  variations: (mealId: string) => ['meal_variations', mealId] as const,
  items: (variationId: string) => ['meal_variation_items', variationId] as const,
  selections: (traineeId: string, date: string) => ['meal_selections', traineeId, date] as const,
  todayMeals: (traineeId: string) => ['today_meals', traineeId] as const,
}

// ─── Plans ────────────────────────────────────────────────────────────────────

export function useMealPlans(traineeId: string | undefined) {
  return useQuery({
    queryKey: mealKeys.plans(traineeId ?? ''),
    enabled: !!traineeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('trainee_id', traineeId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as MealPlan[]
    },
  })
}

export function useMealPlan(planId: string | undefined) {
  return useQuery({
    queryKey: mealKeys.plan(planId ?? ''),
    enabled: !!planId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('id', planId!)
        .single()
      if (error) throw error
      return data as MealPlan
    },
  })
}

export function useCreateMealPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<MealPlan> & { trainee_id: string; title: string }) => {
      const { data, error } = await supabase
        .from('meal_plans')
        .insert(payload)
        .select()
        .single()
      if (error) throw error
      return data as MealPlan
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: mealKeys.plans(data.trainee_id) })
    },
  })
}

export function useUpdateMealPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<MealPlan> & { id: string }) => {
      const { id, ...rest } = payload
      const { data, error } = await supabase
        .from('meal_plans')
        .update(rest)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as MealPlan
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: mealKeys.plan(data.id) })
      qc.invalidateQueries({ queryKey: mealKeys.plans(data.trainee_id) })
    },
  })
}

export function useDeleteMealPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, traineeId }: { id: string; traineeId: string }) => {
      const { error } = await supabase.from('meal_plans').delete().eq('id', id)
      if (error) throw error
      return { traineeId }
    },
    onSuccess: ({ traineeId }) => {
      qc.invalidateQueries({ queryKey: mealKeys.plans(traineeId) })
    },
  })
}

/** RPC: recompute_meal_plan_macros */
export function useRecomputeMealPlanMacros() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (planId: string) => {
      const { data, error } = await supabase.rpc('recompute_meal_plan_macros', {
        p_meal_plan_id: planId,
      })
      if (error) throw error
      return data
    },
    onSuccess: (_data, planId) => {
      qc.invalidateQueries({ queryKey: mealKeys.plan(planId) })
    },
  })
}

// ─── Meals ────────────────────────────────────────────────────────────────────

export function useMeals(planId: string | undefined) {
  return useQuery({
    queryKey: mealKeys.meals(planId ?? ''),
    enabled: !!planId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meals')
        .select('*')
        .eq('meal_plan_id', planId!)
        .order('sort_order', { ascending: true })
      if (error) throw error
      return data as Meal[]
    },
  })
}

export function useCreateMeal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<Meal> & { meal_plan_id: string; name: string; meal_type: string; sort_order: number }) => {
      const { data, error } = await supabase
        .from('meals')
        .insert(payload)
        .select()
        .single()
      if (error) throw error
      return data as Meal
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: mealKeys.meals(data.meal_plan_id) })
    },
  })
}

export function useUpdateMeal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<Meal> & { id: string }) => {
      const { id, ...rest } = payload
      const { data, error } = await supabase
        .from('meals')
        .update(rest)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Meal
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: mealKeys.meals(data.meal_plan_id) })
    },
  })
}

export function useDeleteMeal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, planId }: { id: string; planId: string }) => {
      const { error } = await supabase.from('meals').delete().eq('id', id)
      if (error) throw error
      return { planId }
    },
    onSuccess: ({ planId }) => {
      qc.invalidateQueries({ queryKey: mealKeys.meals(planId) })
    },
  })
}

// ─── Variations ───────────────────────────────────────────────────────────────

export function useMealVariations(mealId: string | undefined) {
  return useQuery({
    queryKey: mealKeys.variations(mealId ?? ''),
    enabled: !!mealId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meal_variations')
        .select('*')
        .eq('meal_id', mealId!)
        .order('sort_order', { ascending: true })
      if (error) throw error
      return data as MealVariation[]
    },
  })
}

export function useCreateMealVariation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<MealVariation> & { meal_id: string; label: string; sort_order: number }) => {
      const { data, error } = await supabase
        .from('meal_variations')
        .insert(payload)
        .select()
        .single()
      if (error) throw error
      return data as MealVariation
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: mealKeys.variations(data.meal_id) })
    },
  })
}

export function useUpdateMealVariation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<MealVariation> & { id: string }) => {
      const { id, ...rest } = payload
      const { data, error } = await supabase
        .from('meal_variations')
        .update(rest)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as MealVariation
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: mealKeys.variations(data.meal_id) })
    },
  })
}

// ─── Variation items ──────────────────────────────────────────────────────────

export function useMealVariationItems(variationId: string | undefined) {
  return useQuery({
    queryKey: mealKeys.items(variationId ?? ''),
    enabled: !!variationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meal_variation_items')
        .select('*')
        .eq('meal_variation_id', variationId!)
        .order('sort_order', { ascending: true })
      if (error) throw error
      return data as MealVariationItem[]
    },
  })
}

export function useUpsertMealVariationItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<MealVariationItem> & { meal_variation_id: string; name: string; quantity: number; unit: string; sort_order: number }) => {
      const { data, error } = await supabase
        .from('meal_variation_items')
        .upsert(payload)
        .select()
        .single()
      if (error) throw error
      return data as MealVariationItem
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: mealKeys.items(data.meal_variation_id) })
    },
  })
}

// ─── Selections ───────────────────────────────────────────────────────────────

export function useMealSelections(traineeId: string | undefined, date: string) {
  return useQuery({
    queryKey: mealKeys.selections(traineeId ?? '', date),
    enabled: !!traineeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trainee_meal_selections')
        .select('*')
        .eq('trainee_id', traineeId!)
        .eq('selected_date', date)
      if (error) throw error
      return data as TraineeMealSelection[]
    },
  })
}

export function useUpsertMealSelection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { trainee_id: string; meal_id: string; meal_variation_id: string; selected_date: string }) => {
      const { data, error } = await supabase
        .from('trainee_meal_selections')
        .upsert(payload, { onConflict: 'trainee_id,meal_id,selected_date' })
        .select()
        .single()
      if (error) throw error
      return data as TraineeMealSelection
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: mealKeys.selections(data.trainee_id, data.selected_date) })
    },
  })
}

/** Today's meal summary — fetch active plan + today's selections */
export function useTodayMealSummary(traineeId: string | undefined) {
  const today = new Date().toISOString().split('T')[0]
  return useQuery({
    queryKey: mealKeys.todayMeals(traineeId ?? ''),
    enabled: !!traineeId,
    queryFn: async () => {
      // Get the most recent meal plan
      const { data: plans, error: planErr } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('trainee_id', traineeId!)
        .order('created_at', { ascending: false })
        .limit(1)
      if (planErr) throw planErr
      const plan = plans?.[0] as MealPlan | undefined

      if (!plan) return { plan: null, meals: [], selections: [] }

      // Get meals for that plan
      const { data: meals, error: mealErr } = await supabase
        .from('meals')
        .select('*, meal_variations(*)')
        .eq('meal_plan_id', plan.id)
        .order('sort_order', { ascending: true })
      if (mealErr) throw mealErr

      // Get today's selections
      const { data: selections, error: selErr } = await supabase
        .from('trainee_meal_selections')
        .select('*')
        .eq('trainee_id', traineeId!)
        .eq('selected_date', today)
      if (selErr) throw selErr

      return {
        plan: plan ?? null,
        meals: (meals ?? []) as (Meal & { meal_variations: MealVariation[] })[],
        selections: (selections ?? []) as TraineeMealSelection[],
      }
    },
  })
}

/** RPC: save_meal_plan_as_template */
export function useSaveMealPlanAsTemplate() {
  return useMutation({
    mutationFn: async (params: {
      meal_plan_id: string
      trainer_id: string
      name: string
      category?: string
      description?: string
      tags?: string[]
    }) => {
      const { data, error } = await supabase.rpc('save_meal_plan_as_template', {
        p_meal_plan_id: params.meal_plan_id,
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

/** RPC: apply_meal_template_to_trainee */
export function useApplyMealTemplate() {
  return useMutation({
    mutationFn: async (params: { template_id: string; trainee_id: string }) => {
      const { data, error } = await supabase.rpc('apply_meal_template_to_trainee', {
        p_template_id: params.template_id,
        p_trainee_id: params.trainee_id,
      })
      if (error) throw error
      return data
    },
  })
}
