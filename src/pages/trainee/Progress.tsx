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
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../lib/auth'
import { useTraineeExerciseProgress } from '../../lib/api/workouts'
import { useBodyMeasurements } from '../../lib/api/measurements'
import { supabase } from '../../lib/supabase'
import { Card, CardHeader, CardTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { PageSpinner, Skeleton } from '../../components/ui/Spinner'
import { EmptyState, ErrorState } from '../../components/ui/States'
import { colors } from '../../theme'

// ─── Types ────────────────────────────────────────────────────────────────────

// Actual RPC response shape from get_trainee_exercise_progress
interface RpcSet {
  rpe: number | null
  reps: number | null
  weight: number | null
  set_index: number
  is_completed: boolean
}

interface RpcLog {
  session_id: string
  /** The RPC returns the date as session_date (fallback completed_at). */
  session_date?: string | null
  completed_at?: string | null
  date?: string | null
  max_weight?: number | null
  sets: RpcSet[]
}

/** The RPC's per-log date lives in session_date / completed_at, not `date`. */
function logDate(log: RpcLog): string | null {
  return log.session_date ?? log.completed_at ?? log.date ?? null
}

interface RpcExercise {
  exercise_id?: string | null
  custom_name?: string | null
  name?: string | null
  /** The RPC returns the resolved library name here. */
  exercise_name?: string | null
  logs: RpcLog[]
}

interface RpcDay {
  day_id: string
  plan_id: string
  day_type: string | null
  day_index: number
  day_title: string | null
  exercises: RpcExercise[]
}

interface RpcProgressResponse {
  days: RpcDay[]
}

// Flattened structure used by the UI
interface ExerciseProgressEntry {
  exercise_key: string   // exercise_id or a stable generated key
  exercise_name: string
  logs: RpcLog[]
}

// ─── Exercise name resolver ───────────────────────────────────────────────────

/** Returns a map of exercise_id → human-readable name for a set of ids. */
function useExerciseNames(ids: string[]) {
  return useQuery({
    queryKey: ['exercise_names', ...ids.slice().sort()],
    enabled: ids.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercises')
        .select('id, name')
        .in('id', ids)
      if (error) throw error
      const map = new Map<string, string>()
      for (const row of data ?? []) {
        if (row.id && row.name) map.set(row.id, row.name)
      }
      return map
    },
  })
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
        rawData={progressQ.data as RpcProgressResponse | undefined}
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

/** Estimated 1-rep max using Epley formula: weight * (1 + reps/30) */
function epley1RM(weight: number, reps: number): number {
  return Math.round(weight * (1 + reps / 30))
}

function flattenExercises(
  rawData: RpcProgressResponse | undefined,
  nameMap: Map<string, string>,
): ExerciseProgressEntry[] {
  if (!rawData?.days) return []
  const map = new Map<string, ExerciseProgressEntry>()
  for (const day of rawData.days) {
    for (const ex of day.exercises ?? []) {
      const key = ex.exercise_id ?? ex.custom_name ?? ex.exercise_name ?? ex.name ?? 'unknown'
      // Priority: custom_name → RPC's resolved exercise_name → RPC name → resolved exercises table name → friendly fallback
      const name =
        ex.custom_name ??
        ex.exercise_name ??
        (ex.name && ex.name !== ex.exercise_id ? ex.name : null) ??
        (ex.exercise_id ? nameMap.get(ex.exercise_id) : undefined) ??
        'Exercise'
      if (!map.has(key)) {
        map.set(key, { exercise_key: key, exercise_name: name, logs: [] })
      }
      const entry = map.get(key)!
      entry.logs.push(...(ex.logs ?? []))
    }
  }
  return Array.from(map.values()).filter((e) => e.logs.length > 0)
}

function ExerciseProgressSection({
  rawData,
  isLoading,
  isError,
  onRetry,
}: {
  rawData: RpcProgressResponse | undefined
  isLoading: boolean
  isError: boolean
  onRetry: () => void
}) {
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null)

  // Collect all exercise_ids that look like UUIDs so we can resolve their names
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const exerciseIds = React.useMemo(() => {
    if (!rawData?.days) return []
    const ids = new Set<string>()
    for (const day of rawData.days) {
      for (const ex of day.exercises ?? []) {
        if (ex.exercise_id && UUID_RE.test(ex.exercise_id)) ids.add(ex.exercise_id)
      }
    }
    return Array.from(ids)
  }, [rawData])

  const namesQ = useExerciseNames(exerciseIds)
  const nameMap = namesQ.data ?? new Map<string, string>()

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

  const exercises = flattenExercises(rawData, nameMap)

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

  const active = selectedExercise ?? exercises[0]?.exercise_key
  const activeEntry = exercises.find((e) => e.exercise_key === active)

  // Build chart data: one point per session log — top-set weight and estimated 1RM
  const chartData = [...(activeEntry?.logs ?? [])]
    .sort((a, b) => new Date(logDate(a) ?? 0).getTime() - new Date(logDate(b) ?? 0).getTime())
    .map((log) => {
      const completedSets = (log.sets ?? []).filter(
        (s) => s.is_completed && s.weight != null && s.reps != null,
      )
      const topSet = completedSets.reduce<RpcSet | null>((best, s) => {
        if (!best) return s
        return (s.weight ?? 0) > (best.weight ?? 0) ? s : best
      }, null)
      const maxWeight = topSet?.weight ?? null
      const est1RM =
        topSet?.weight != null && topSet?.reps != null
          ? epley1RM(topSet.weight, topSet.reps)
          : null
      const d = logDate(log)
      return {
        date: d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—',
        maxWeight,
        est1RM,
      }
    })
    .filter((d) => d.maxWeight != null || d.est1RM != null)

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
            key={ex.exercise_key}
            onClick={() => setSelectedExercise(ex.exercise_key)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[36px]"
            style={{
              backgroundColor:
                active === ex.exercise_key ? `${colors.primary}20` : colors.cardElevated,
              color: active === ex.exercise_key ? colors.primary : colors.textSecondary,
              border: `1px solid ${active === ex.exercise_key ? colors.primary : colors.border}`,
            }}
            aria-pressed={active === ex.exercise_key}
          >
            {ex.exercise_name}
          </button>
        ))}
      </div>

      {/* Chart */}
      {chartData.length === 0 ? (
        <p className="text-sm text-text-tertiary text-center py-6">No completed sets recorded.</p>
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
                name="Top Set (kg)"
                stroke={colors.primary}
                strokeWidth={2}
                dot={{ r: 3, fill: colors.primary }}
                activeDot={{ r: 5 }}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="est1RM"
                name="Est. 1RM (kg)"
                stroke={colors.macroCarbs}
                strokeWidth={2}
                dot={{ r: 3, fill: colors.macroCarbs }}
                activeDot={{ r: 5 }}
                connectNulls
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
