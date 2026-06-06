import React from 'react'
import { Pill, Clock, Info } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { useSupplementPlan } from '../../lib/api/supplements'
import { Card } from '../../components/ui/Card'
import { PageSpinner } from '../../components/ui/Spinner'
import { EmptyState, ErrorState } from '../../components/ui/States'
import { colors } from '../../theme'
import type { SupplementItem } from '../../types'

// ─── Main page ────────────────────────────────────────────────────────────────

export function TraineeSupplementsPage() {
  const { user } = useAuth()
  const suppQ = useSupplementPlan(user?.id)

  if (suppQ.isLoading) return <PageSpinner />

  if (suppQ.isError) {
    return (
      <div className="page-container">
        <h1 className="text-2xl font-bold text-text mb-6">Supplements</h1>
        <ErrorState
          message="Could not load your supplement plan."
          onRetry={() => suppQ.refetch()}
        />
      </div>
    )
  }

  const items = suppQ.data?.items ?? []
  const plan = suppQ.data?.plan

  if (!items.length) {
    return (
      <div className="page-container">
        <h1 className="text-2xl font-bold text-text mb-6">Supplements</h1>
        <EmptyState
          icon={<Pill className="w-7 h-7 text-text-tertiary" />}
          title="No supplements assigned"
          description="Your trainer will assign supplements when needed."
        />
      </div>
    )
  }

  // Group by category, sorted by sort_order
  const sorted = [...items].sort((a, b) => a.sort_order - b.sort_order)
  const groups = sorted.reduce<Record<string, SupplementItem[]>>((acc, item) => {
    const cat = item.category ?? 'General'
    acc[cat] = acc[cat] ?? []
    acc[cat].push(item)
    return acc
  }, {})

  // Timing groups for a secondary "by timing" summary
  const timingGroups = sorted.reduce<Record<string, SupplementItem[]>>((acc, item) => {
    const t = item.timing ?? 'Anytime'
    acc[t] = acc[t] ?? []
    acc[t].push(item)
    return acc
  }, {})

  return (
    <div className="page-container max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-text mb-1">Supplements</h1>
      {plan?.title && (
        <p className="text-sm text-text-secondary mb-5">{plan.title}</p>
      )}
      {plan?.notes && (
        <div className="flex gap-2 bg-info/10 border border-info/20 rounded-lg px-3 py-2 mb-5">
          <Info className="w-4 h-4 text-info flex-shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm text-text-secondary">{plan.notes}</p>
        </div>
      )}

      {/* By-timing quick summary */}
      {Object.keys(timingGroups).length > 1 && (
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3">
            By Timing
          </h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(timingGroups).map(([timing, tItems]) => (
              <div
                key={timing}
                className="flex items-center gap-1.5 bg-card-elevated rounded-full px-3 py-1.5 border border-border"
              >
                <Clock className="w-3 h-3 text-primary" aria-hidden="true" />
                <span className="text-xs text-text">{timing}</span>
                <span className="text-xs text-text-tertiary">({tItems.length})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* By category */}
      <div className="flex flex-col gap-6">
        {Object.entries(groups).map(([category, catItems]) => (
          <section key={category} aria-label={`${category} supplements`}>
            <h2 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3">
              {category}
            </h2>
            <div className="flex flex-col gap-2">
              {catItems.map((item) => (
                <SupplementCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

// ─── Supplement card ──────────────────────────────────────────────────────────

function SupplementCard({ item }: { item: SupplementItem }) {
  return (
    <Card>
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${colors.primary}15` }}
          aria-hidden="true"
        >
          <Pill className="w-4 h-4 text-primary" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text">{item.type}</p>
              {item.brand && (
                <p className="text-xs text-text-tertiary">{item.brand}</p>
              )}
            </div>
            {!item.is_active && (
              <span className="text-xs text-text-tertiary bg-card-elevated border border-border px-2 py-0.5 rounded-full flex-shrink-0">
                Inactive
              </span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {item.dosage && (
              <DetailRow icon="dosage" label="Dosage" value={item.dosage} />
            )}
            {item.timing && (
              <DetailRow icon="timing" label="Timing" value={item.timing} />
            )}
          </div>

          {item.instructions && (
            <p className="mt-2 text-xs text-text-secondary italic leading-relaxed">
              {item.instructions}
            </p>
          )}
        </div>
      </div>
    </Card>
  )
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: string
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-1">
      {icon === 'timing' ? (
        <Clock className="w-3 h-3 text-text-tertiary flex-shrink-0" aria-hidden="true" />
      ) : (
        <Pill className="w-3 h-3 text-text-tertiary flex-shrink-0" aria-hidden="true" />
      )}
      <span className="text-xs text-text-tertiary">{label}:</span>
      <span className="text-xs text-text">{value}</span>
    </div>
  )
}
