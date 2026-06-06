import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, Dumbbell, Activity, Plus } from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { useAuth } from '../../lib/auth'
import { useTraineeExerciseProgress } from '../../lib/api/workouts'
import { useBodyMeasurements } from '../../lib/api/measurements'
import { Card, CardHeader, CardTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { PageSpinner, Skeleton } from '../../components/ui/Spinner'
import { EmptyState, ErrorState } from '../../components/ui/States'
import { colors } from '../../theme'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExerciseProgressEntry {
  exercise_id: string
  exercise_name: string
  sessions: {
    session_date: string
    max_weight: number | null
    total_volume: number | null
    avg_rpe: number | null
    sets_completed: number
  }[]
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function TraineeProgressPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const progressQ = useTraineeExerciseProgress(user?.id)
  const measurementsQ = useBodyMeasurements(user?.id)

  const isLoading = progressQ.isLoading || measurementsQ.isLoading
  const isError = progressQ.isError && measurementsQ.isError

  if (isLoading) return <PageSpinner />

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text">Progress</h1>
        <Button
          size="sm"
          variant="secondary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => navigate('/body-measurements')}
        >
          Measurements
        </Button>
      </div>

      {/* Body weight trend */}
      <BodyWeightSection
        measurements={measurementsQ.data ?? []}
        isLoading={measurementsQ.isLoading}
        isError={measurementsQ.isError}
        onRetry={() => measurementsQ.refetch()}
      />

      {/* Exercise charts */}
      <ExerciseProgressSection
        data={progressQ.data as ExerciseProgressEntry[] | undefined}
        isLoading={progressQ.isLoading}
        isError={progressQ.isError}
        onRetry={() => progressQ.refetch()}
      />
    </div>
  )
}

// ─── Body weight section ──────────────────────────────────────────────────────

interface Measurement {
  id: string
  measured_at: string
  weight_kg: number | null
  body_fat_pct: number | null
}

function BodyWeightSection({
  measurements,
  isLoading,
  isError,
  onRetry,
}: {
  measurements: Measurement[]
  isLoading: boolean
  isError: boolean
  onRetry: () => void
}) {
  // Only entries with weight data
  const weightData = [...measurements]
    .filter((m) => m.weight_kg != null)
    .sort((a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime())
    .map((m) => ({
      date: new Date(m.measured_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      weight: m.weight_kg,
      bodyFat: m.body_fat_pct,
    }))

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Body Weight</CardTitle>
        <Activity className="w-5 h-5 text-primary" aria-hidden="true" />
      </CardHeader>

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : isError ? (
        <ErrorState message="Could not load measurements." onRetry={onRetry} className="py-8" />
      ) : weightData.length === 0 ? (
        <EmptyState
          title="No weight data"
          description="Log body measurements to track your weight trend."
          className="py-8"
        />
      ) : (
        <div className="h-48 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weightData} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.divider} />
              <XAxis
                dataKey="date"
                tick={{ fill: colors.textTertiary, fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fill: colors.textTertiary, fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                domain={['auto', 'auto']}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: colors.cardElevated,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 8,
                  color: colors.text,
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="weight"
                name="Weight (kg)"
                stroke={colors.primary}
                strokeWidth={2}
                dot={{ r: 3, fill: colors.primary }}
                activeDot={{ r: 5 }}
              />
              {weightData.some((d) => d.bodyFat != null) && (
                <Line
                  type="monotone"
                  dataKey="bodyFat"
                  name="Body Fat %"
                  stroke={colors.macroFat}
                  strokeWidth={2}
                  dot={{ r: 3, fill: colors.macroFat }}
                  activeDot={{ r: 5 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {weightData.length > 0 && (
        <div className="flex gap-4 mt-3">
          <StatPill label="Latest" value={`${weightData[weightData.length - 1]?.weight ?? '—'} kg`} />
          {weightData.length > 1 && (
            <StatPill
              label="Change"
              value={`${((weightData[weightData.length - 1]?.weight ?? 0) - (weightData[0]?.weight ?? 0)).toFixed(1)} kg`}
            />
          )}
        </div>
      )}
    </Card>
  )
}

// ─── Exercise progress section ────────────────────────────────────────────────

function ExerciseProgressSection({
  data,
  isLoading,
  isError,
  onRetry,
}: {
  data: ExerciseProgressEntry[] | undefined
  isLoading: boolean
  isError: boolean
  onRetry: () => void
}) {
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null)

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Exercise Progress</CardTitle>
        </CardHeader>
        <Skeleton className="h-48 w-full" />
      </Card>
    )
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Exercise Progress</CardTitle>
        </CardHeader>
        <ErrorState message="Could not load exercise progress." onRetry={onRetry} className="py-8" />
      </Card>
    )
  }

  const exercises = data ?? []
  if (!exercises.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Exercise Progress</CardTitle>
          <Dumbbell className="w-5 h-5 text-text-tertiary" aria-hidden="true" />
        </CardHeader>
        <EmptyState
          title="No exercise data"
          description="Log workouts to see your performance over time."
          className="py-8"
        />
      </Card>
    )
  }

  const active = selectedExercise ?? exercises[0]?.exercise_id
  const activeEntry = exercises.find((e) => e.exercise_id === active)

  const chartData = (activeEntry?.sessions ?? [])
    .sort((a, b) => new Date(a.session_date).getTime() - new Date(b.session_date).getTime())
    .map((s) => ({
      date: new Date(s.session_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      maxWeight: s.max_weight,
      volume: s.total_volume,
      rpe: s.avg_rpe,
    }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Exercise Progress</CardTitle>
        <Dumbbell className="w-5 h-5 text-primary" aria-hidden="true" />
      </CardHeader>

      {/* Exercise selector */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
        {exercises.map((ex) => (
          <button
            key={ex.exercise_id}
            onClick={() => setSelectedExercise(ex.exercise_id)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[36px]"
            style={{
              backgroundColor:
                active === ex.exercise_id ? `${colors.primary}20` : colors.cardElevated,
              color: active === ex.exercise_id ? colors.primary : colors.textSecondary,
              border: `1px solid ${active === ex.exercise_id ? colors.primary : colors.border}`,
            }}
            aria-pressed={active === ex.exercise_id}
          >
            {ex.exercise_name}
          </button>
        ))}
      </div>

      {/* Chart */}
      {chartData.length === 0 ? (
        <p className="text-sm text-text-tertiary text-center py-6">No sessions recorded.</p>
      ) : (
        <div className="h-52 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.divider} />
              <XAxis
                dataKey="date"
                tick={{ fill: colors.textTertiary, fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fill: colors.textTertiary, fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                domain={['auto', 'auto']}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: colors.cardElevated,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 8,
                  color: colors.text,
                  fontSize: 12,
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, color: colors.textTertiary, paddingTop: 8 }}
              />
              <Line
                type="monotone"
                dataKey="maxWeight"
                name="Max Weight (kg)"
                stroke={colors.primary}
                strokeWidth={2}
                dot={{ r: 3, fill: colors.primary }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="volume"
                name="Volume (kg)"
                stroke={colors.macroCarbs}
                strokeWidth={2}
                dot={{ r: 3, fill: colors.macroCarbs }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}

// ─── Stat pill ────────────────────────────────────────────────────────────────

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 bg-card-elevated rounded-full px-3 py-1 border border-border">
      <span className="text-xs text-text-tertiary">{label}:</span>
      <span className="text-xs font-medium text-text">{value}</span>
    </div>
  )
}
