import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Dumbbell, Utensils, Pill, ChevronRight, Clock } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { useWorkoutPlans, useWorkoutDays, useWorkoutDayExercises } from '../../lib/api/workouts'
import { useMealPlans, useMeals, useMealVariations } from '../../lib/api/meals'
import { useSupplementPlan } from '../../lib/api/supplements'
import { Tabs, TabList, Tab, TabPanel } from '../../components/ui/Tabs'
import { Card, CardHeader, CardTitle } from '../../components/ui/Card'
import { Skeleton, SkeletonCard } from '../../components/ui/Spinner'
import { EmptyState, ErrorState } from '../../components/ui/States'
import { Button } from '../../components/ui/Button'
import { colors } from '../../theme'
import type { WorkoutDay, WorkoutDayExercise, Exercise, Meal, MealVariation } from '../../types'

// ─── Day names ────────────────────────────────────────────────────────────────

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const MEAL_TYPE_COLORS: Record<string, string> = {
  breakfast: colors.mealBreakfast,
  lunch: colors.mealLunch,
  dinner: colors.mealDinner,
  snack: colors.mealSnack,
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function TraineeSchedulePage() {
  const { user } = useAuth()

  const plansQ = useWorkoutPlans(user?.id)
  const mealPlansQ = useMealPlans(user?.id)
  const suppQ = useSupplementPlan(user?.id)

  const activePlan = plansQ.data?.[0]
  const activeMealPlan = mealPlansQ.data?.[0]

  return (
    <div className="page-container">
      <h1 className="text-2xl font-bold text-text mb-6">Schedule</h1>

      <Tabs defaultTab="workout">
        <TabList className="mb-5">
          <Tab id="workout">Workout</Tab>
          <Tab id="meals">Meals</Tab>
          <Tab id="supplements">Supplements</Tab>
        </TabList>

        <TabPanel id="workout">
          <WorkoutTab
            plansLoading={plansQ.isLoading}
            plansError={plansQ.isError}
            activePlanId={activePlan?.id}
            activePlanTitle={activePlan?.title}
            onRetry={() => plansQ.refetch()}
          />
        </TabPanel>

        <TabPanel id="meals">
          <MealsTab
            plansLoading={mealPlansQ.isLoading}
            plansError={mealPlansQ.isError}
            activePlanId={activeMealPlan?.id}
            activePlanTitle={activeMealPlan?.title}
            onRetry={() => mealPlansQ.refetch()}
          />
        </TabPanel>

        <TabPanel id="supplements">
          <SupplementsTab
            isLoading={suppQ.isLoading}
            isError={suppQ.isError}
            data={suppQ.data}
            onRetry={() => suppQ.refetch()}
          />
        </TabPanel>
      </Tabs>
    </div>
  )
}

// ─── Workout tab ──────────────────────────────────────────────────────────────

interface WorkoutTabProps {
  plansLoading: boolean
  plansError: boolean
  activePlanId: string | undefined
  activePlanTitle: string | undefined
  onRetry: () => void
}

function WorkoutTab({ plansLoading, plansError, activePlanId, activePlanTitle, onRetry }: WorkoutTabProps) {
  const daysQ = useWorkoutDays(activePlanId)
  const navigate = useNavigate()
  const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1

  if (plansLoading || daysQ.isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[...Array(5)].map((_, i) => <SkeletonCard key={i} />)}
      </div>
    )
  }

  if (plansError || daysQ.isError) {
    return <ErrorState message="Could not load workout plan." onRetry={onRetry} />
  }

  if (!activePlanId || !daysQ.data?.length) {
    return (
      <EmptyState
        icon={<Dumbbell className="w-7 h-7 text-text-tertiary" />}
        title="No workout plan"
        description="Your trainer will assign a workout plan soon."
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-text-secondary mb-1">
        Plan: <span className="text-text font-medium">{activePlanTitle}</span>
      </p>
      {daysQ.data.map((day) => (
        <WorkoutDayCard
          key={day.id}
          day={day}
          isToday={day.day_index === todayIndex}
          onStart={() => navigate(`/workout/session?dayId=${day.id}`)}
        />
      ))}
    </div>
  )
}

function WorkoutDayCard({
  day,
  isToday,
  onStart,
}: {
  day: WorkoutDay
  isToday: boolean
  onStart: () => void
}) {
  const [expanded, setExpanded] = React.useState(isToday)
  const exercisesQ = useWorkoutDayExercises(expanded ? day.id : undefined)

  return (
    <Card elevated={isToday} className={isToday ? 'border-primary/40' : ''}>
      <button
        className="w-full text-left flex items-center gap-3 min-h-[44px]"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls={`day-exercises-${day.id}`}
      >
        {/* Day badge */}
        <div
          className="w-10 h-10 rounded-lg flex-shrink-0 flex flex-col items-center justify-center text-xs font-bold"
          style={{
            backgroundColor: isToday ? `${colors.primary}20` : `${colors.cardPressed}`,
            color: isToday ? colors.primary : colors.textSecondary,
          }}
        >
          <span>{DAY_NAMES[day.day_index] ?? `D${day.day_index + 1}`}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text truncate">
            {day.title ?? `Day ${day.day_index + 1}`}
            {isToday && (
              <span className="ml-2 text-xs text-primary font-normal">(Today)</span>
            )}
          </p>
          {day.day_type && (
            <p className="text-xs text-text-tertiary capitalize">{day.day_type}</p>
          )}
        </div>
        <ChevronRight
          className="w-4 h-4 text-text-tertiary flex-shrink-0 transition-transform"
          style={{ transform: expanded ? 'rotate(90deg)' : undefined }}
          aria-hidden="true"
        />
      </button>

      {expanded && (
        <div id={`day-exercises-${day.id}`} className="mt-3 pt-3 border-t border-divider">
          {isToday && (
            <Button size="sm" className="w-full mb-3" onClick={onStart}>
              Start Workout
            </Button>
          )}
          {exercisesQ.isLoading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : exercisesQ.isError ? (
            <p className="text-sm text-error">Failed to load exercises.</p>
          ) : exercisesQ.data?.length ? (
            <ol className="flex flex-col gap-2" aria-label="Exercises">
              {exercisesQ.data.map((ex, i) => (
                <ExerciseRow key={ex.id} ex={ex} index={i} />
              ))}
            </ol>
          ) : (
            <p className="text-sm text-text-tertiary">No exercises assigned.</p>
          )}
        </div>
      )}
    </Card>
  )
}

function ExerciseRow({
  ex,
  index,
}: {
  ex: WorkoutDayExercise & { exercises: Exercise }
  index: number
}) {
  const name = ex.custom_name ?? ex.exercises?.name ?? 'Exercise'
  return (
    <li className="flex items-center gap-3 text-sm">
      <span className="w-5 h-5 rounded-full bg-card-elevated flex items-center justify-center text-xs text-text-tertiary flex-shrink-0">
        {index + 1}
      </span>
      <span className="flex-1 min-w-0 text-text truncate">{name}</span>
      <span className="text-text-tertiary text-xs flex-shrink-0">{ex.sets} sets</span>
    </li>
  )
}

// ─── Meals tab ────────────────────────────────────────────────────────────────

interface MealsTabProps {
  plansLoading: boolean
  plansError: boolean
  activePlanId: string | undefined
  activePlanTitle: string | undefined
  onRetry: () => void
}

function MealsTab({ plansLoading, plansError, activePlanId, activePlanTitle, onRetry }: MealsTabProps) {
  const mealsQ = useMeals(activePlanId)

  if (plansLoading || mealsQ.isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
      </div>
    )
  }

  if (plansError || mealsQ.isError) {
    return <ErrorState message="Could not load meal plan." onRetry={onRetry} />
  }

  if (!activePlanId || !mealsQ.data?.length) {
    return (
      <EmptyState
        icon={<Utensils className="w-7 h-7 text-text-tertiary" />}
        title="No meal plan"
        description="Your trainer will assign a meal plan soon."
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-text-secondary mb-1">
        Plan: <span className="text-text font-medium">{activePlanTitle}</span>
      </p>
      {mealsQ.data.map((meal) => (
        <MealCard key={meal.id} meal={meal} />
      ))}
    </div>
  )
}

function MealCard({ meal }: { meal: Meal }) {
  const [expanded, setExpanded] = React.useState(false)
  const variationsQ = useMealVariations(expanded ? meal.id : undefined)
  const color = MEAL_TYPE_COLORS[meal.meal_type] ?? colors.primary

  return (
    <Card>
      <button
        className="w-full text-left flex items-center gap-3 min-h-[44px]"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls={`meal-variations-${meal.id}`}
      >
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text truncate">{meal.name}</p>
          {meal.target_time && (
            <p className="text-xs text-text-tertiary flex items-center gap-1 mt-0.5">
              <Clock className="w-3 h-3" aria-hidden="true" />
              {meal.target_time}
            </p>
          )}
        </div>
        <span
          className="text-xs capitalize px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ color, backgroundColor: `${color}20` }}
        >
          {meal.meal_type}
        </span>
        <ChevronRight
          className="w-4 h-4 text-text-tertiary flex-shrink-0 transition-transform"
          style={{ transform: expanded ? 'rotate(90deg)' : undefined }}
          aria-hidden="true"
        />
      </button>

      {expanded && (
        <div id={`meal-variations-${meal.id}`} className="mt-3 pt-3 border-t border-divider">
          {variationsQ.isLoading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : variationsQ.isError ? (
            <p className="text-sm text-error">Failed to load variations.</p>
          ) : variationsQ.data?.length ? (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-text-tertiary font-medium uppercase tracking-wide">Variations</p>
              {variationsQ.data.map((v) => <VariationRow key={v.id} variation={v} />)}
            </div>
          ) : (
            <p className="text-sm text-text-tertiary">No variations defined.</p>
          )}
        </div>
      )}
    </Card>
  )
}

function VariationRow({ variation }: { variation: MealVariation }) {
  return (
    <div className="flex items-center gap-3 text-sm py-1">
      <div className="flex-1 min-w-0">
        <p className="text-text truncate">{variation.label}</p>
        {variation.total_calories != null && (
          <p className="text-xs text-text-tertiary">
            {Math.round(variation.total_calories)} kcal
            {variation.total_protein != null && ` · P ${Math.round(variation.total_protein)}g`}
            {variation.total_carbs != null && ` · C ${Math.round(variation.total_carbs)}g`}
            {variation.total_fat != null && ` · F ${Math.round(variation.total_fat)}g`}
          </p>
        )}
      </div>
      {variation.is_default && (
        <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full flex-shrink-0">
          Default
        </span>
      )}
    </div>
  )
}

// ─── Supplements tab ──────────────────────────────────────────────────────────

interface SupplementsTabProps {
  isLoading: boolean
  isError: boolean
  data: { plan: import('../../types').SupplementPlan; items: import('../../types').SupplementItem[] } | null | undefined
  onRetry: () => void
}

function SupplementsTab({ isLoading, isError, data, onRetry }: SupplementsTabProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
      </div>
    )
  }

  if (isError) {
    return <ErrorState message="Could not load supplements." onRetry={onRetry} />
  }

  const items = data?.items ?? []

  if (!items.length) {
    return (
      <EmptyState
        icon={<Pill className="w-7 h-7 text-text-tertiary" />}
        title="No supplements"
        description="Your trainer will assign supplements when needed."
      />
    )
  }

  // Group by category
  const groups = items.reduce<Record<string, typeof items>>((acc, item) => {
    const cat = item.category ?? 'General'
    acc[cat] = acc[cat] ?? []
    acc[cat].push(item)
    return acc
  }, {})

  return (
    <div className="flex flex-col gap-4">
      {data?.plan?.title && (
        <p className="text-sm text-text-secondary">
          Plan: <span className="text-text font-medium">{data.plan.title}</span>
        </p>
      )}
      {Object.entries(groups).map(([category, groupItems]) => (
        <div key={category}>
          <h2 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">
            {category}
          </h2>
          <div className="flex flex-col gap-2">
            {groupItems.map((item) => (
              <Card key={item.id} padding="sm">
                <div className="flex items-start gap-3">
                  <Pill className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text">
                      {item.type}
                      {item.brand && (
                        <span className="text-text-tertiary font-normal"> · {item.brand}</span>
                      )}
                    </p>
                    {item.dosage && (
                      <p className="text-xs text-text-secondary mt-0.5">Dosage: {item.dosage}</p>
                    )}
                    {item.timing && (
                      <p className="text-xs text-text-tertiary mt-0.5">Timing: {item.timing}</p>
                    )}
                    {item.instructions && (
                      <p className="text-xs text-text-tertiary mt-0.5 italic">{item.instructions}</p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
