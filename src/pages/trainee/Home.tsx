import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Dumbbell, ChevronRight, Utensils, User } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { useUser, useTrainee, useTrainerDashboard } from '../../lib/api/users'
import { useWorkoutPlans, useWorkoutDays } from '../../lib/api/workouts'
import { useTodayMealSummary } from '../../lib/api/meals'
import { Card, CardHeader, CardTitle } from '../../components/ui/Card'
import { Avatar } from '../../components/ui/Avatar'
import { Skeleton } from '../../components/ui/Spinner'
import { ErrorState } from '../../components/ui/States'
import { Button } from '../../components/ui/Button'
import { colors } from '../../theme'

const MEAL_TYPE_COLORS: Record<string, string> = {
  breakfast: colors.mealBreakfast,
  lunch: colors.mealLunch,
  dinner: colors.mealDinner,
  snack: colors.mealSnack,
}

export function TraineeHomePage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  // Load trainee row to get trainer_id
  const traineeQ = useTrainee(user?.id)
  const trainee = traineeQ.data

  // Load trainer user record
  const trainerUserQ = useUser(trainee?.trainer_id ?? undefined)
  const trainerUser = trainerUserQ.data

  // Today's workout — get active plan then today's day
  const plansQ = useWorkoutPlans(user?.id)
  const activePlan = plansQ.data?.[0]
  const daysQ = useWorkoutDays(activePlan?.id)

  // Today's day index (0 = Monday style)
  const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1
  const todayDay = daysQ.data?.find((d) => d.day_index === todayIndex)

  // Today's meals
  const mealQ = useTodayMealSummary(user?.id)

  const isLoading = traineeQ.isLoading || plansQ.isLoading || mealQ.isLoading

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-text-secondary text-sm">{greeting()}</p>
          <h1 className="text-2xl font-bold text-text">
            {user?.email?.split('@')[0] ?? 'Athlete'} 💪
          </h1>
        </div>
        <Avatar src={null} name={user?.email} size="md" />
      </div>

      <div className="flex flex-col gap-4">
        {/* Today's Workout */}
        <Card>
          <CardHeader>
            <CardTitle>Today's Workout</CardTitle>
            <Dumbbell className="w-5 h-5 text-primary" aria-hidden="true" />
          </CardHeader>

          {isLoading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : todayDay ? (
            <div>
              <p className="text-lg font-semibold text-text mb-1">
                {todayDay.title ?? `Day ${todayDay.day_index + 1}`}
              </p>
              {todayDay.day_type && (
                <span className="text-xs text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full">
                  {todayDay.day_type}
                </span>
              )}
              <Button
                size="sm"
                className="mt-3 w-full"
                onClick={() => navigate(`/workout/session?dayId=${todayDay.id}`)}
              >
                Start Workout
              </Button>
            </div>
          ) : activePlan ? (
            <p className="text-text-secondary text-sm">Rest day — no workout scheduled today.</p>
          ) : (
            <div className="text-center py-4">
              <p className="text-text-secondary text-sm mb-3">No workout plan yet.</p>
              <p className="text-xs text-text-tertiary">Your trainer will assign a plan soon.</p>
            </div>
          )}
        </Card>

        {/* Trainer card */}
        {(trainerUser || traineeQ.isLoading) && (
          <Card elevated>
            <CardHeader>
              <CardTitle>My Trainer</CardTitle>
              <User className="w-5 h-5 text-text-tertiary" aria-hidden="true" />
            </CardHeader>
            {trainerUserQ.isLoading || traineeQ.isLoading ? (
              <div className="flex items-center gap-3">
                <Skeleton className="w-11 h-11 rounded-full" />
                <div className="flex-1 flex flex-col gap-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ) : trainerUser ? (
              <button
                className="flex items-center gap-3 w-full text-left hover:bg-card-elevated p-2 -m-2 rounded-lg transition-colors"
                onClick={() => navigate(`/profile/view/${trainerUser.id}`)}
                aria-label={`View ${trainerUser.display_name ?? 'trainer'}'s profile`}
              >
                <Avatar src={trainerUser.photo_url} name={trainerUser.display_name} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-text font-medium truncate">
                    {trainerUser.display_name ?? 'Your Trainer'}
                  </p>
                  {trainerUser.username && (
                    <p className="text-text-tertiary text-xs">@{trainerUser.username}</p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-text-tertiary flex-shrink-0" aria-hidden="true" />
              </button>
            ) : (
              <p className="text-text-secondary text-sm">No trainer assigned yet.</p>
            )}
          </Card>
        )}

        {/* Meal summary */}
        <Card>
          <CardHeader>
            <CardTitle>Today's Meals</CardTitle>
            <Utensils className="w-5 h-5 text-primary" aria-hidden="true" />
          </CardHeader>

          {mealQ.isLoading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : mealQ.isError ? (
            <ErrorState message="Could not load meals." onRetry={() => mealQ.refetch()} />
          ) : mealQ.data?.meals?.length ? (
            <div className="flex flex-col gap-2">
              {/* Macro summary */}
              {mealQ.data.plan && (
                <MacroBar
                  calories={mealQ.data.plan.total_calories}
                  protein={mealQ.data.plan.total_protein}
                  carbs={mealQ.data.plan.total_carbs}
                  fat={mealQ.data.plan.total_fat}
                />
              )}
              {/* Meal list */}
              <div className="flex flex-col gap-2 mt-2">
                {mealQ.data.meals.slice(0, 4).map((meal) => {
                  const color = MEAL_TYPE_COLORS[meal.meal_type] ?? colors.primary
                  return (
                    <div key={meal.id} className="flex items-center gap-3">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: color }}
                        aria-hidden="true"
                      />
                      <span className="text-sm text-text">{meal.name}</span>
                      <span
                        className="text-xs ml-auto capitalize px-2 py-0.5 rounded-full"
                        style={{ color, backgroundColor: `${color}20` }}
                      >
                        {meal.meal_type}
                      </span>
                    </div>
                  )
                })}
                {mealQ.data.meals.length > 4 && (
                  <p className="text-xs text-text-tertiary">
                    +{mealQ.data.meals.length - 4} more
                  </p>
                )}
              </div>
              <button
                className="text-xs text-primary mt-1 text-left hover:text-primary-light"
                onClick={() => navigate('/schedule')}
              >
                View full plan →
              </button>
            </div>
          ) : (
            <p className="text-text-secondary text-sm">No meal plan assigned yet.</p>
          )}
        </Card>
      </div>
    </div>
  )
}

function MacroBar({
  calories,
  protein,
  carbs,
  fat,
}: {
  calories: number | null
  protein: number | null
  carbs: number | null
  fat: number | null
}) {
  return (
    <div className="flex items-center justify-between bg-card-elevated rounded-lg px-4 py-3">
      <MacroStat label="Calories" value={calories} unit="kcal" />
      <div className="w-px h-6 bg-divider" aria-hidden="true" />
      <MacroStat label="Protein" value={protein} unit="g" color={colors.macroProtein} />
      <div className="w-px h-6 bg-divider" aria-hidden="true" />
      <MacroStat label="Carbs" value={carbs} unit="g" color={colors.macroCarbs} />
      <div className="w-px h-6 bg-divider" aria-hidden="true" />
      <MacroStat label="Fat" value={fat} unit="g" color={colors.macroFat} />
    </div>
  )
}

function MacroStat({
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
