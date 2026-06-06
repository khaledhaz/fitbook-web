import React, { useState } from 'react'
import { Utensils, ChevronDown, ChevronUp, Check } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import {
  useMealPlans,
  useMeals,
  useMealVariations,
  useMealVariationItems,
  useMealSelections,
  useUpsertMealSelection,
} from '../../lib/api/meals'
import { Card, CardHeader, CardTitle } from '../../components/ui/Card'
import { PageSpinner, Skeleton, SkeletonCard } from '../../components/ui/Spinner'
import { EmptyState, ErrorState } from '../../components/ui/States'
import { useToast } from '../../components/ui/Toast'
import { colors } from '../../theme'
import type { Meal, MealVariation, MealVariationItem, TraineeMealSelection } from '../../types'

// ─── Constants ────────────────────────────────────────────────────────────────

const MEAL_TYPE_COLORS: Record<string, string> = {
  breakfast: colors.mealBreakfast,
  lunch: colors.mealLunch,
  dinner: colors.mealDinner,
  snack: colors.mealSnack,
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function TraineeMealsPage() {
  const { user } = useAuth()
  const today = new Date().toISOString().split('T')[0]

  const plansQ = useMealPlans(user?.id)
  const activePlan = plansQ.data?.[0]

  const mealsQ = useMeals(activePlan?.id)
  const selectionsQ = useMealSelections(user?.id, today)

  const isLoading = plansQ.isLoading || mealsQ.isLoading || selectionsQ.isLoading
  const isError = plansQ.isError || mealsQ.isError || selectionsQ.isError

  if (isLoading) {
    return (
      <div className="page-container">
        <h1 className="text-2xl font-bold text-text mb-6">Meal Plan</h1>
        <div className="flex flex-col gap-3">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="page-container">
        <h1 className="text-2xl font-bold text-text mb-6">Meal Plan</h1>
        <ErrorState
          message="Could not load your meal plan."
          onRetry={() => {
            plansQ.refetch()
            mealsQ.refetch()
            selectionsQ.refetch()
          }}
        />
      </div>
    )
  }

  if (!activePlan || !mealsQ.data?.length) {
    return (
      <div className="page-container">
        <h1 className="text-2xl font-bold text-text mb-6">Meal Plan</h1>
        <EmptyState
          icon={<Utensils className="w-7 h-7 text-text-tertiary" />}
          title="No meal plan"
          description="Your trainer will assign a meal plan soon."
        />
      </div>
    )
  }

  const selections = selectionsQ.data ?? []

  return (
    <div className="page-container max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-text mb-1">Meal Plan</h1>
      <p className="text-sm text-text-secondary mb-2">{activePlan.title}</p>

      {/* Plan macro totals */}
      {(activePlan.total_calories != null || activePlan.total_protein != null) && (
        <MacroSummary plan={activePlan} />
      )}

      <div className="flex flex-col gap-4 mt-5">
        {mealsQ.data.map((meal) => {
          const currentSelection = selections.find((s) => s.meal_id === meal.id)
          return (
            <MealCard
              key={meal.id}
              meal={meal}
              traineeId={user!.id}
              today={today}
              currentSelection={currentSelection}
            />
          )
        })}
      </div>
    </div>
  )
}

// ─── Macro summary bar ────────────────────────────────────────────────────────

function MacroSummary({
  plan,
}: {
  plan: {
    total_calories: number | null
    total_protein: number | null
    total_carbs: number | null
    total_fat: number | null
  }
}) {
  return (
    <div className="flex items-center justify-between bg-card-elevated rounded-lg px-4 py-3 border border-border mt-3">
      <MacroCell label="Calories" value={plan.total_calories} unit="kcal" />
      <div className="w-px h-6 bg-divider" aria-hidden="true" />
      <MacroCell label="Protein" value={plan.total_protein} unit="g" color={colors.macroProtein} />
      <div className="w-px h-6 bg-divider" aria-hidden="true" />
      <MacroCell label="Carbs" value={plan.total_carbs} unit="g" color={colors.macroCarbs} />
      <div className="w-px h-6 bg-divider" aria-hidden="true" />
      <MacroCell label="Fat" value={plan.total_fat} unit="g" color={colors.macroFat} />
    </div>
  )
}

function MacroCell({
  label,
  value,
  unit,
  color,
}: {
  label: string
  value: number | null
  unit: string
  color?: string
}) {
  return (
    <div className="text-center">
      <p className="text-xs text-text-tertiary">{label}</p>
      <p className="text-sm font-semibold" style={color ? { color } : { color: colors.text }}>
        {value != null ? `${Math.round(value)}${unit}` : '—'}
      </p>
    </div>
  )
}

// ─── Meal card ────────────────────────────────────────────────────────────────

interface MealCardProps {
  meal: Meal
  traineeId: string
  today: string
  currentSelection: TraineeMealSelection | undefined
}

function MealCard({ meal, traineeId, today, currentSelection }: MealCardProps) {
  const [expanded, setExpanded] = useState(true)
  const variationsQ = useMealVariations(meal.id)
  const { toast } = useToast()
  const upsertSelection = useUpsertMealSelection()
  const color = MEAL_TYPE_COLORS[meal.meal_type] ?? colors.primary

  const handleSelectVariation = async (variationId: string) => {
    try {
      await upsertSelection.mutateAsync({
        trainee_id: traineeId,
        meal_id: meal.id,
        meal_variation_id: variationId,
        selected_date: today,
      })
      toast('Meal selection saved', 'success')
    } catch (e) {
      toast((e as Error).message ?? 'Failed to save selection', 'error')
    }
  }

  return (
    <Card>
      <button
        className="w-full text-left flex items-center gap-3 min-h-[44px]"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls={`meal-body-${meal.id}`}
      >
        <div
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-text truncate">{meal.name}</p>
          {meal.target_time && (
            <p className="text-xs text-text-tertiary">{meal.target_time}</p>
          )}
        </div>
        <span
          className="text-xs capitalize px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ color, backgroundColor: `${color}20` }}
        >
          {meal.meal_type}
        </span>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-text-tertiary flex-shrink-0 ml-1" aria-hidden="true" />
        ) : (
          <ChevronDown className="w-4 h-4 text-text-tertiary flex-shrink-0 ml-1" aria-hidden="true" />
        )}
      </button>

      {expanded && (
        <div id={`meal-body-${meal.id}`} className="mt-4 pt-4 border-t border-divider">
          {variationsQ.isLoading ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : variationsQ.isError ? (
            <p className="text-sm text-error">Failed to load variations.</p>
          ) : variationsQ.data?.length ? (
            <div>
              <p className="text-xs text-text-tertiary font-medium uppercase tracking-wide mb-3">
                Choose a variation for today
              </p>
              <div className="flex flex-col gap-2" role="radiogroup" aria-label={`Variations for ${meal.name}`}>
                {variationsQ.data.map((v) => (
                  <VariationOption
                    key={v.id}
                    variation={v}
                    isSelected={currentSelection?.meal_variation_id === v.id}
                    isPending={upsertSelection.isPending}
                    onSelect={() => handleSelectVariation(v.id)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-text-tertiary">No variations available.</p>
          )}
        </div>
      )}
    </Card>
  )
}

// ─── Variation option ─────────────────────────────────────────────────────────

interface VariationOptionProps {
  variation: MealVariation
  isSelected: boolean
  isPending: boolean
  onSelect: () => void
}

function VariationOption({ variation, isSelected, isPending, onSelect }: VariationOptionProps) {
  const [expanded, setExpanded] = useState(false)
  const itemsQ = useMealVariationItems(expanded ? variation.id : undefined)

  return (
    <div
      className="rounded-lg border transition-colors overflow-hidden"
      style={{
        borderColor: isSelected ? colors.primary : colors.border,
        backgroundColor: isSelected ? `${colors.primary}08` : colors.cardElevated,
      }}
    >
      {/* Header row — click to select */}
      <button
        role="radio"
        aria-checked={isSelected}
        onClick={onSelect}
        disabled={isPending}
        className="w-full text-left flex items-center gap-3 px-3 py-3 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {/* Radio indicator */}
        <div
          className="w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors"
          style={{
            borderColor: isSelected ? colors.primary : colors.border,
            backgroundColor: isSelected ? colors.primary : 'transparent',
          }}
          aria-hidden="true"
        >
          {isSelected && <Check className="w-2.5 h-2.5" style={{ color: colors.textOnPrimary }} />}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text">{variation.label}</p>
          {variation.total_calories != null && (
            <p className="text-xs text-text-tertiary mt-0.5">
              <span style={{ color: colors.text }}>{Math.round(variation.total_calories)} kcal</span>
              {variation.total_protein != null && (
                <> · <span style={{ color: colors.macroProtein }}>P {Math.round(variation.total_protein)}g</span></>
              )}
              {variation.total_carbs != null && (
                <> · <span style={{ color: colors.macroCarbs }}>C {Math.round(variation.total_carbs)}g</span></>
              )}
              {variation.total_fat != null && (
                <> · <span style={{ color: colors.macroFat }}>F {Math.round(variation.total_fat)}g</span></>
              )}
            </p>
          )}
        </div>

        {variation.is_default && (
          <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full flex-shrink-0">
            Default
          </span>
        )}
      </button>

      {/* Expand items toggle */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-tertiary hover:text-text border-t border-divider transition-colors min-h-[36px]"
        aria-expanded={expanded}
        aria-controls={`items-${variation.id}`}
      >
        {expanded ? (
          <ChevronUp className="w-3 h-3" aria-hidden="true" />
        ) : (
          <ChevronDown className="w-3 h-3" aria-hidden="true" />
        )}
        {expanded ? 'Hide items' : 'Show food items'}
      </button>

      {expanded && (
        <div id={`items-${variation.id}`} className="px-3 pb-3">
          {itemsQ.isLoading ? (
            <div className="flex flex-col gap-2 pt-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : itemsQ.isError ? (
            <p className="text-xs text-error pt-2">Failed to load items.</p>
          ) : itemsQ.data?.length ? (
            <ul className="flex flex-col gap-1.5 pt-2">
              {itemsQ.data.map((item) => (
                <FoodItemRow key={item.id} item={item} />
              ))}
            </ul>
          ) : (
            <p className="text-xs text-text-tertiary pt-2">No items listed.</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Food item row ────────────────────────────────────────────────────────────

function FoodItemRow({ item }: { item: MealVariationItem }) {
  return (
    <li className="flex items-center justify-between text-xs gap-2">
      <span className="text-text truncate flex-1 min-w-0">{item.name}</span>
      <span className="text-text-tertiary flex-shrink-0">
        {item.quantity} {item.unit}
      </span>
      {item.calories != null && (
        <span className="text-text-tertiary flex-shrink-0">{Math.round(item.calories)} kcal</span>
      )}
    </li>
  )
}
