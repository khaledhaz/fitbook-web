import React, { useState } from 'react'
import { useBodyMeasurements } from '../../../lib/api/measurements'
import { Card } from '../../../components/ui/Card'
import { Skeleton } from '../../../components/ui/Spinner'
import { EmptyState, ErrorState } from '../../../components/ui/States'
import { SectionTitle } from './_shared/SectionTitle'
import { Ruler, TrendingDown, TrendingUp, Minus } from 'lucide-react'
import type { BodyMeasurement } from '../../../types'
import { colors } from '../../../theme'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MeasurementsViewProps {
  traineeId: string
}

type MeasurementField = {
  key: keyof Pick<
    BodyMeasurement,
    | 'weight_kg'
    | 'body_fat_pct'
    | 'chest_cm'
    | 'waist_cm'
    | 'hips_cm'
    | 'neck_cm'
    | 'bicep_cm'
    | 'thigh_cm'
    | 'calf_cm'
    | 'shoulders_cm'
    | 'forearm_cm'
  >
  label: string
  unit: string
  lowerIsBetter?: boolean
}

const MEASUREMENT_FIELDS: MeasurementField[] = [
  { key: 'weight_kg', label: 'Weight', unit: 'kg' },
  { key: 'body_fat_pct', label: 'Body Fat', unit: '%', lowerIsBetter: true },
  { key: 'chest_cm', label: 'Chest', unit: 'cm' },
  { key: 'waist_cm', label: 'Waist', unit: 'cm', lowerIsBetter: true },
  { key: 'hips_cm', label: 'Hips', unit: 'cm' },
  { key: 'neck_cm', label: 'Neck', unit: 'cm' },
  { key: 'bicep_cm', label: 'Bicep', unit: 'cm' },
  { key: 'shoulders_cm', label: 'Shoulders', unit: 'cm' },
  { key: 'thigh_cm', label: 'Thigh', unit: 'cm' },
  { key: 'calf_cm', label: 'Calf', unit: 'cm' },
  { key: 'forearm_cm', label: 'Forearm', unit: 'cm' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return iso
  }
}

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  return formatDate(iso)
}

// ─── Trend Indicator ─────────────────────────────────────────────────────────

function TrendIndicator({
  current,
  previous,
  lowerIsBetter,
}: {
  current: number
  previous: number
  lowerIsBetter?: boolean
}) {
  const diff = current - previous
  if (Math.abs(diff) < 0.01) {
    return <Minus className="w-4 h-4 text-text-tertiary" aria-label="No change" />
  }
  const improved = lowerIsBetter ? diff < 0 : diff > 0
  const Icon = diff > 0 ? TrendingUp : TrendingDown
  const color = improved ? colors.success : colors.error
  return (
    <span className="flex items-center gap-1 text-xs font-semibold flex-shrink-0">
      <Icon className="w-3 h-3" style={{ color }} aria-hidden="true" />
      <span style={{ color }}>
        {diff > 0 ? '+' : ''}{diff.toFixed(1)}
      </span>
    </span>
  )
}

// ─── Summary Grid ─────────────────────────────────────────────────────────────

function SummaryGrid({
  latest,
  previous,
}: {
  latest: BodyMeasurement
  previous: BodyMeasurement | undefined
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {MEASUREMENT_FIELDS.map((field) => {
        const val = latest[field.key] as number | null
        const prevVal = previous ? (previous[field.key] as number | null) : null
        if (val == null) return null
        return (
          <Card key={field.key} elevated className="py-3 px-4 min-w-0">
            <p className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-1 truncate">
              {field.label}
            </p>
            <div className="flex items-end justify-between gap-2 min-w-0">
              <p className="text-xl font-bold text-text truncate">
                {val.toFixed(1)}<span className="text-sm font-normal text-text-tertiary ml-0.5">{field.unit}</span>
              </p>
              {prevVal != null && (
                <TrendIndicator
                  current={val}
                  previous={prevVal}
                  lowerIsBetter={field.lowerIsBetter}
                />
              )}
            </div>
          </Card>
        )
      })}
    </div>
  )
}

// ─── History Row ─────────────────────────────────────────────────────────────

function HistoryRow({ measurement }: { measurement: BodyMeasurement }) {
  const [expanded, setExpanded] = useState(false)
  const hasDetails = MEASUREMENT_FIELDS.some(
    (f) => f.key !== 'weight_kg' && measurement[f.key] != null,
  )

  return (
    <div className="border border-border rounded-lg overflow-hidden mb-2">
      <button
        className="w-full flex items-center justify-between p-3 bg-card hover:bg-card-elevated transition-colors text-left"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-label={`Measurement from ${formatDate(measurement.measured_at)}`}
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text truncate">
            {formatDate(measurement.measured_at)}
          </p>
          <p className="text-xs text-text-tertiary">{relativeDate(measurement.measured_at)}</p>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          {measurement.weight_kg != null && (
            <div className="text-right">
              <p className="text-xs text-text-tertiary">Weight</p>
              <p className="text-sm font-semibold text-primary">{measurement.weight_kg} kg</p>
            </div>
          )}
          {measurement.body_fat_pct != null && (
            <div className="text-right">
              <p className="text-xs text-text-tertiary">Body Fat</p>
              <p className="text-sm font-semibold text-primary">{measurement.body_fat_pct}%</p>
            </div>
          )}
          <span
            className="text-text-tertiary text-xs transition-transform duration-200"
            style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
            aria-hidden="true"
          >
            ▾
          </span>
        </div>
      </button>

      {expanded && hasDetails && (
        <div className="grid grid-cols-2 gap-2 p-3 bg-card-elevated border-t border-divider">
          {MEASUREMENT_FIELDS.filter((f) => f.key !== 'weight_kg' && f.key !== 'body_fat_pct').map(
            (field) => {
              const val = measurement[field.key] as number | null
              if (val == null) return null
              return (
                <div key={field.key} className="flex items-center justify-between gap-2 min-w-0">
                  <span className="text-xs text-text-tertiary truncate">{field.label}</span>
                  <span className="text-xs font-semibold text-text flex-shrink-0">
                    {val.toFixed(1)} {field.unit}
                  </span>
                </div>
              )
            },
          )}
          {measurement.notes && (
            <div className="col-span-2 pt-2 border-t border-divider">
              <p className="text-xs text-text-tertiary">Notes</p>
              <p className="text-xs text-text mt-0.5">{measurement.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function MeasurementsView({ traineeId }: MeasurementsViewProps) {
  const measQ = useBodyMeasurements(traineeId)

  if (measQ.isLoading) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-12 rounded-lg" />
        <Skeleton className="h-12 rounded-lg" />
        <Skeleton className="h-12 rounded-lg" />
      </div>
    )
  }

  if (measQ.isError) {
    return (
      <ErrorState
        message="Could not load measurements."
        onRetry={() => measQ.refetch()}
        className="py-12"
      />
    )
  }

  const measurements = measQ.data ?? []

  if (measurements.length === 0) {
    return (
      <EmptyState
        icon={<Ruler className="w-7 h-7 text-text-tertiary" />}
        title="No Measurements Yet"
        description="This trainee hasn't logged any body measurements."
        className="py-12"
      />
    )
  }

  const latest = measurements[0]
  const previous = measurements[1]

  return (
    <div className="flex flex-col gap-5 p-4">
      {/* Latest snapshot */}
      <section>
        <SectionTitle>Latest Snapshot</SectionTitle>
        <p className="text-xs text-text-tertiary mb-3">
          Recorded {relativeDate(latest.measured_at)} — {formatDate(latest.measured_at)}
        </p>
        <SummaryGrid latest={latest} previous={previous} />
      </section>

      {/* History */}
      {measurements.length > 1 && (
        <section>
          <SectionTitle>History ({measurements.length} entries)</SectionTitle>
          <div className="overflow-y-auto max-h-[60vh]">
            {measurements.map((m) => (
              <HistoryRow key={m.id} measurement={m} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
