import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, TrendingUp, Dumbbell, BarChart2 } from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts'
import { useUser } from '../../lib/api/users'
import { useTraineeInsights } from './_shared/hooks'
import { Card, CardHeader, CardTitle } from '../../components/ui/Card'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Skeleton, SkeletonCard } from '../../components/ui/Spinner'
import { EmptyState, ErrorState } from '../../components/ui/States'
import { colors } from '../../theme'

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatWeekLabel(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export function TraineeInsightsPage() {
  const { traineeId } = useParams<{ traineeId: string }>()
  const navigate = useNavigate()

  const userQ = useUser(traineeId)
  const insightsQ = useTraineeInsights(traineeId)

  const data = insightsQ.data
  const compliance = data?.compliance
  const volumeTrend = data?.volume_trend ?? []
  const recentSessions = data?.recent_sessions ?? []
  const topExercises = data?.top_exercises ?? []

  // Compliance ring value
  const complianceRate = compliance
    ? Math.round((compliance.sessions_this_week / Math.max(compliance.prescribed_days, 1)) * 100)
    : 0
  const clampedRate = Math.min(complianceRate, 100)

  // Chart data
  const volumeChartData = volumeTrend.map((v) => ({
    week: formatWeekLabel(v.week_start),
    volume: v.total_volume,
    sessions: v.session_count,
  }))

  const exerciseChartData = topExercises.slice(0, 8).map((e) => ({
    name: e.exercise_name.length > 12 ? e.exercise_name.slice(0, 12) + '…' : e.exercise_name,
    sets: e.total_sets,
    weight: e.best_weight ?? 0,
  }))

  return (
    <div className="page-container">
      {/* Back + header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center w-10 h-10 rounded-lg text-text-secondary hover:text-text hover:bg-card transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" aria-hidden="true" />
        </button>
        {userQ.isLoading ? (
          <div className="flex items-center gap-2">
            <Skeleton className="w-9 h-9 rounded-full" />
            <Skeleton className="h-5 w-36" />
          </div>
        ) : (
          <div className="flex items-center gap-2 min-w-0">
            <Avatar src={userQ.data?.photo_url} name={userQ.data?.display_name} size="sm" />
            <h1 className="text-xl font-bold text-text truncate">
              {userQ.data?.display_name ?? 'Trainee'} — Insights
            </h1>
          </div>
        )}
      </div>

      {/* Quick nav to logs */}
      <div className="flex gap-2 mb-5">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => navigate(`/trainer/trainee/${traineeId}/logs`)}
          leftIcon={<Dumbbell className="w-4 h-4" />}
        >
          View Logs
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => navigate(`/trainer/trainee/${traineeId}`)}
          leftIcon={<TrendingUp className="w-4 h-4" />}
        >
          Edit Plans
        </Button>
      </div>

      {/* Error */}
      {insightsQ.isError && (
        <ErrorState
          message="Could not load insights data."
          onRetry={() => insightsQ.refetch()}
        />
      )}

      {/* Loading */}
      {insightsQ.isLoading && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((k) => <SkeletonCard key={k} />)}
          </div>
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {/* No data */}
      {!insightsQ.isLoading && !insightsQ.isError && !data && (
        <EmptyState
          icon={<BarChart2 className="w-7 h-7 text-text-tertiary" />}
          title="No insights yet"
          description="Insights appear after this trainee logs at least one workout session."
        />
      )}

      {/* Data */}
      {!insightsQ.isLoading && data && (
        <div className="flex flex-col gap-5">
          {/* Compliance stats */}
          <section aria-label="Compliance overview">
            <Card>
              <CardHeader>
                <CardTitle>Compliance</CardTitle>
                <TrendingUp className="w-5 h-5 text-primary" aria-hidden="true" />
              </CardHeader>
              {compliance ? (
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  {/* SVG compliance ring */}
                  <ComplianceRing rate={clampedRate} label={`${compliance.sessions_this_week}/${compliance.prescribed_days}`} />
                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 flex-1 min-w-0 w-full">
                    <MiniStat label="Sessions this week" value={`${compliance.sessions_this_week}/${compliance.prescribed_days}`} />
                    <MiniStat label="Total sessions" value={String(compliance.total_sessions)} />
                    <MiniStat label="Total sets" value={String(compliance.total_sets_completed)} />
                    <MiniStat
                      label="Compliance rate"
                      value={`${Math.round(compliance.compliance_rate ?? complianceRate)}%`}
                      highlight={clampedRate >= 75}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-text-secondary text-sm">No compliance data available.</p>
              )}
            </Card>
          </section>

          {/* Volume trend chart */}
          {volumeChartData.length > 0 && (
            <section aria-label="Volume trend chart">
              <Card>
                <CardHeader>
                  <CardTitle>Weekly Volume Trend</CardTitle>
                  <BarChart2 className="w-5 h-5 text-primary" aria-hidden="true" />
                </CardHeader>
                <div style={{ height: 200 }} aria-hidden="true">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={volumeChartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="volumeGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={colors.primary} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={colors.primary} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={colors.divider} />
                      <XAxis
                        dataKey="week"
                        tick={{ fill: colors.textTertiary, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: colors.textTertiary, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={36}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: colors.cardElevated,
                          border: `1px solid ${colors.border}`,
                          borderRadius: 8,
                          color: colors.text,
                          fontSize: 12,
                        }}
                        labelStyle={{ color: colors.textSecondary }}
                      />
                      <Area
                        type="monotone"
                        dataKey="volume"
                        name="Volume (kg)"
                        stroke={colors.primary}
                        strokeWidth={2}
                        fill="url(#volumeGrad)"
                        dot={false}
                        activeDot={{ r: 4, fill: colors.primary }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-text-tertiary mt-2 text-center">Total weight lifted (kg) per week</p>
              </Card>
            </section>
          )}

          {/* Top exercises */}
          {exerciseChartData.length > 0 && (
            <section aria-label="Top exercises chart">
              <Card>
                <CardHeader>
                  <CardTitle>Top Exercises</CardTitle>
                  <Dumbbell className="w-5 h-5 text-primary" aria-hidden="true" />
                </CardHeader>
                <div style={{ height: 200 }} aria-hidden="true">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={exerciseChartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={colors.divider} vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: colors.textTertiary, fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: colors.textTertiary, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={32}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: colors.cardElevated,
                          border: `1px solid ${colors.border}`,
                          borderRadius: 8,
                          color: colors.text,
                          fontSize: 12,
                        }}
                        labelStyle={{ color: colors.textSecondary }}
                      />
                      <Bar dataKey="sets" name="Total sets" fill={colors.primary} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </section>
          )}

          {/* Recent sessions table */}
          {recentSessions.length > 0 && (
            <section aria-label="Recent sessions">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Sessions</CardTitle>
                </CardHeader>
                <div className="overflow-x-auto -mx-4 px-4">
                  <table className="w-full text-sm min-w-[420px]" aria-label="Recent workout sessions">
                    <thead>
                      <tr className="text-left text-xs text-text-tertiary border-b border-divider">
                        <th className="pb-2 font-medium pr-3">Date</th>
                        <th className="pb-2 font-medium pr-3">Day</th>
                        <th className="pb-2 font-medium pr-3 text-right">Sets</th>
                        <th className="pb-2 font-medium text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentSessions.map((s) => (
                        <tr key={s.session_id} className="border-b border-divider last:border-0">
                          <td className="py-2.5 pr-3 text-text-secondary">
                            {new Date(s.started_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </td>
                          <td className="py-2.5 pr-3 text-text truncate max-w-[120px]">
                            {s.day_title ?? '—'}
                          </td>
                          <td className="py-2.5 pr-3 text-right text-text">
                            {s.completed_sets}/{s.total_sets}
                          </td>
                          <td className="py-2.5 text-right">
                            <span
                              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                s.completed_at
                                  ? 'bg-success/15 text-success'
                                  : 'bg-warning/15 text-warning'
                              }`}
                            >
                              {s.completed_at ? 'Done' : 'Partial'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

// ─── ComplianceRing ────────────────────────────────────────────────────────────

function ComplianceRing({ rate, label }: { rate: number; label: string }) {
  const r = 36
  const circumference = 2 * Math.PI * r
  const dash = (rate / 100) * circumference

  return (
    <div className="relative flex-shrink-0 w-24 h-24 flex items-center justify-center" aria-label={`Compliance ring: ${rate}%`}>
      <svg width="96" height="96" className="rotate-[-90deg]" aria-hidden="true">
        <circle cx="48" cy="48" r={r} fill="none" stroke={colors.border} strokeWidth="8" />
        <circle
          cx="48"
          cy="48"
          r={r}
          fill="none"
          stroke={rate >= 75 ? colors.success : rate >= 50 ? colors.warning : colors.error}
          strokeWidth="8"
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-sm font-bold text-primary">{label}</span>
    </div>
  )
}

// ─── MiniStat ─────────────────────────────────────────────────────────────────

function MiniStat({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xl font-bold" style={{ color: highlight ? colors.success : colors.text }}>
        {value}
      </p>
      <p className="text-xs text-text-tertiary mt-0.5">{label}</p>
    </div>
  )
}
