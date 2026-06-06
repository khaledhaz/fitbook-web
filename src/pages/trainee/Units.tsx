import React, { useState, useEffect } from 'react'
import { Check, Ruler } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { useUser, useUpdateUser } from '../../lib/api/users'
import { Card, CardHeader, CardTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { PageSpinner } from '../../components/ui/Spinner'
import { ErrorState } from '../../components/ui/States'
import { useToast } from '../../components/ui/Toast'
import { colors } from '../../theme'

// ─── Unit option type ─────────────────────────────────────────────────────────

type UnitSystem = 'metric' | 'imperial'

interface UnitOption {
  value: UnitSystem
  label: string
  description: string
  examples: string[]
}

const UNIT_OPTIONS: UnitOption[] = [
  {
    value: 'metric',
    label: 'Metric',
    description: 'Kilograms, centimetres, and kilometres.',
    examples: ['Weight: kg', 'Height: cm', 'Distance: km'],
  },
  {
    value: 'imperial',
    label: 'Imperial',
    description: 'Pounds, inches, and miles.',
    examples: ['Weight: lbs', 'Height: ft / in', 'Distance: mi'],
  },
]

// ─── Main page ────────────────────────────────────────────────────────────────

export function TraineeUnitsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const userQ = useUser(user?.id)
  const updateUser = useUpdateUser()

  const [selected, setSelected] = useState<UnitSystem>('metric')
  const [hasChanged, setHasChanged] = useState(false)

  // Sync with DB value
  useEffect(() => {
    if (userQ.data?.preferred_units) {
      setSelected(userQ.data.preferred_units)
    }
  }, [userQ.data?.preferred_units])

  const handleSelect = (unit: UnitSystem) => {
    setSelected(unit)
    setHasChanged(unit !== (userQ.data?.preferred_units ?? 'metric'))
  }

  const handleSave = async () => {
    if (!user) return
    try {
      await updateUser.mutateAsync({ id: user.id, preferred_units: selected })
      toast('Unit preference saved!', 'success')
      setHasChanged(false)
    } catch (e) {
      toast((e as Error).message ?? 'Failed to save', 'error')
    }
  }

  if (userQ.isLoading) return <PageSpinner />

  if (userQ.isError) {
    return (
      <div className="page-container max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-text mb-6">Units</h1>
        <ErrorState
          message="Could not load your preferences."
          onRetry={() => userQ.refetch()}
        />
      </div>
    )
  }

  return (
    <div className="page-container max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${colors.primary}20` }}
          aria-hidden="true"
        >
          <Ruler className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text">Units</h1>
          <p className="text-sm text-text-secondary">Choose your preferred measurement system.</p>
        </div>
      </div>

      {/* Unit options */}
      <div
        className="flex flex-col gap-3 mb-8"
        role="radiogroup"
        aria-label="Unit system"
      >
        {UNIT_OPTIONS.map((opt) => {
          const isSelected = selected === opt.value
          return (
            <button
              key={opt.value}
              role="radio"
              aria-checked={isSelected}
              onClick={() => handleSelect(opt.value)}
              className="w-full text-left rounded-xl border transition-all p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[44px]"
              style={{
                borderColor: isSelected ? colors.primary : colors.border,
                backgroundColor: isSelected
                  ? `${colors.primary}10`
                  : colors.cardElevated,
              }}
            >
              <div className="flex items-start gap-3">
                {/* Radio indicator */}
                <div
                  className="w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors"
                  style={{
                    borderColor: isSelected ? colors.primary : colors.border,
                    backgroundColor: isSelected ? colors.primary : 'transparent',
                  }}
                  aria-hidden="true"
                >
                  {isSelected && (
                    <Check className="w-3 h-3" style={{ color: colors.textOnPrimary }} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-text">{opt.label}</p>
                  <p className="text-sm text-text-secondary mt-0.5">{opt.description}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                    {opt.examples.map((ex) => (
                      <span key={ex} className="text-xs text-text-tertiary">
                        {ex}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Info note */}
      <Card padding="sm" className="mb-8">
        <p className="text-xs text-text-secondary leading-relaxed">
          This preference is stored on your account and used throughout the app when displaying
          weights, measurements, and distances. Existing data is stored in metric internally
          and converted for display.
        </p>
      </Card>

      {/* Save button */}
      <Button
        fullWidth
        size="lg"
        isLoading={updateUser.isPending}
        disabled={!hasChanged}
        onClick={handleSave}
      >
        {hasChanged ? 'Save Preference' : 'Up to date'}
      </Button>

      {/* Current status */}
      {!hasChanged && userQ.data?.preferred_units && (
        <p className="text-xs text-text-tertiary text-center mt-3">
          Currently set to{' '}
          <span className="text-text font-medium capitalize">{userQ.data.preferred_units}</span>
        </p>
      )}
    </div>
  )
}
