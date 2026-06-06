import React, { useState } from 'react'
import { Plus, Edit2, Scale, ChevronDown, ChevronUp } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import {
  useBodyMeasurements,
  useAddBodyMeasurement,
  useUpdateBodyMeasurement,
} from '../../lib/api/measurements'
import { Card, CardHeader, CardTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Sheet } from '../../components/ui/Modal'
import { PageSpinner } from '../../components/ui/Spinner'
import { EmptyState, ErrorState } from '../../components/ui/States'
import { useToast } from '../../components/ui/Toast'
import { colors } from '../../theme'
import type { BodyMeasurement } from '../../types'

// ─── Field config ─────────────────────────────────────────────────────────────

const MEASUREMENT_FIELDS: { key: keyof BodyMeasurement; label: string; unit: string }[] = [
  { key: 'weight_kg', label: 'Weight', unit: 'kg' },
  { key: 'body_fat_pct', label: 'Body Fat', unit: '%' },
  { key: 'chest_cm', label: 'Chest', unit: 'cm' },
  { key: 'waist_cm', label: 'Waist', unit: 'cm' },
  { key: 'hips_cm', label: 'Hips', unit: 'cm' },
  { key: 'neck_cm', label: 'Neck', unit: 'cm' },
  { key: 'bicep_cm', label: 'Bicep', unit: 'cm' },
  { key: 'thigh_cm', label: 'Thigh', unit: 'cm' },
  { key: 'calf_cm', label: 'Calf', unit: 'cm' },
  { key: 'shoulders_cm', label: 'Shoulders', unit: 'cm' },
  { key: 'forearm_cm', label: 'Forearm', unit: 'cm' },
]

type FormDraft = Partial<Record<keyof BodyMeasurement, string>>

function blankDraft(): FormDraft {
  return {}
}

function draftFromMeasurement(m: BodyMeasurement): FormDraft {
  const d: FormDraft = {}
  MEASUREMENT_FIELDS.forEach(({ key }) => {
    const v = m[key]
    if (v != null) d[key] = String(v)
  })
  return d
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function TraineeBodyMeasurementsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const measurementsQ = useBodyMeasurements(user?.id)
  const addMeasurement = useAddBodyMeasurement()
  const updateMeasurement = useUpdateBodyMeasurement()

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<BodyMeasurement | null>(null)
  const [draft, setDraft] = useState<FormDraft>(blankDraft())
  const [saving, setSaving] = useState(false)
  const [dateInput, setDateInput] = useState(new Date().toISOString().split('T')[0])

  const openAddSheet = () => {
    setEditTarget(null)
    setDraft(blankDraft())
    setDateInput(new Date().toISOString().split('T')[0])
    setSheetOpen(true)
  }

  const openEditSheet = (m: BodyMeasurement) => {
    setEditTarget(m)
    setDraft(draftFromMeasurement(m))
    setDateInput(m.measured_at.split('T')[0])
    setSheetOpen(true)
  }

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    try {
      const payload: Partial<BodyMeasurement> = { user_id: user.id, measured_at: dateInput }
      MEASUREMENT_FIELDS.forEach(({ key }) => {
        const v = draft[key]
        if (v !== undefined && v !== '') {
          ;(payload as Record<string, unknown>)[key] = parseFloat(v as string)
        }
      })

      if (editTarget) {
        await updateMeasurement.mutateAsync({ ...(payload as BodyMeasurement), id: editTarget.id, user_id: user.id })
        toast('Measurement updated!', 'success')
      } else {
        await addMeasurement.mutateAsync({ ...(payload as BodyMeasurement), user_id: user.id, measured_at: dateInput })
        toast('Measurement saved!', 'success')
      }
      setSheetOpen(false)
    } catch (e) {
      toast((e as Error).message ?? 'Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (measurementsQ.isLoading) return <PageSpinner />

  if (measurementsQ.isError) {
    return (
      <div className="page-container">
        <h1 className="text-2xl font-bold text-text mb-6">Body Measurements</h1>
        <ErrorState
          message="Could not load measurements."
          onRetry={() => measurementsQ.refetch()}
        />
      </div>
    )
  }

  const measurements = measurementsQ.data ?? []

  return (
    <div className="page-container max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text">Body Measurements</h1>
        <Button
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={openAddSheet}
        >
          Add
        </Button>
      </div>

      {measurements.length === 0 ? (
        <EmptyState
          icon={<Scale className="w-7 h-7 text-text-tertiary" />}
          title="No measurements yet"
          description="Track your body metrics over time."
          action={{ label: 'Add first measurement', onClick: openAddSheet }}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {measurements.map((m) => (
            <MeasurementCard
              key={m.id}
              measurement={m}
              onEdit={() => openEditSheet(m)}
            />
          ))}
        </div>
      )}

      {/* Add / Edit sheet */}
      <Sheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editTarget ? 'Edit Measurement' : 'Add Measurement'}
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Date"
            type="date"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            aria-label="Measurement date"
          />

          <div className="grid grid-cols-2 gap-3">
            {MEASUREMENT_FIELDS.map(({ key, label, unit }) => (
              <Input
                key={key}
                label={`${label} (${unit})`}
                type="number"
                inputMode="decimal"
                min={0}
                step={0.1}
                value={draft[key] ?? ''}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, [key]: e.target.value }))
                }
                placeholder={`${label}`}
              />
            ))}
          </div>

          <Button fullWidth isLoading={saving} onClick={handleSave}>
            {editTarget ? 'Update' : 'Save Measurement'}
          </Button>
        </div>
      </Sheet>
    </div>
  )
}

// ─── Measurement card ─────────────────────────────────────────────────────────

function MeasurementCard({
  measurement: m,
  onEdit,
}: {
  measurement: BodyMeasurement
  onEdit: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  const primaryFields = MEASUREMENT_FIELDS.slice(0, 2) // weight + body fat
  const secondaryFields = MEASUREMENT_FIELDS.slice(2)

  const filledSecondary = secondaryFields.filter(({ key }) => m[key] != null)

  return (
    <Card>
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${colors.primary}15` }}
          aria-hidden="true"
        >
          <Scale className="w-4 h-4 text-primary" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-text">
              {new Date(m.measured_at).toLocaleDateString(undefined, {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </p>
            <button
              onClick={onEdit}
              className="p-1 rounded-lg hover:bg-card-elevated text-text-tertiary hover:text-text transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
              aria-label="Edit measurement"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Primary values */}
          <div className="flex gap-4 mt-2">
            {primaryFields.map(({ key, label, unit }) => {
              const v = m[key] as number | null
              if (v == null) return null
              return (
                <div key={key}>
                  <p className="text-xs text-text-tertiary">{label}</p>
                  <p className="text-sm font-semibold text-text">
                    {v}
                    <span className="text-xs text-text-tertiary ml-0.5">{unit}</span>
                  </p>
                </div>
              )
            })}
          </div>

          {/* Expand/collapse secondary fields */}
          {filledSecondary.length > 0 && (
            <>
              <button
                onClick={() => setExpanded((v) => !v)}
                className="flex items-center gap-1 text-xs text-text-tertiary hover:text-text mt-2 transition-colors min-h-[32px]"
                aria-expanded={expanded}
                aria-controls={`secondary-${m.id}`}
              >
                {expanded ? (
                  <ChevronUp className="w-3 h-3" aria-hidden="true" />
                ) : (
                  <ChevronDown className="w-3 h-3" aria-hidden="true" />
                )}
                {expanded ? 'Hide details' : `${filledSecondary.length} more measurements`}
              </button>

              {expanded && (
                <div
                  id={`secondary-${m.id}`}
                  className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3 pt-3 border-t border-divider"
                >
                  {filledSecondary.map(({ key, label, unit }) => {
                    const v = m[key] as number | null
                    if (v == null) return null
                    return (
                      <div key={key} className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-text-tertiary">{label}</span>
                        <span className="text-text font-medium">
                          {v} {unit}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {m.notes && (
            <p className="text-xs text-text-secondary mt-2 italic">{m.notes}</p>
          )}
        </div>
      </div>
    </Card>
  )
}
