import React, { useEffect, useState } from 'react'
import {
  useSupplementPlan,
  useUpsertSupplementItem,
  useDeleteSupplementItem,
} from '../../../lib/api/supplements'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Input, Textarea } from '../../../components/ui/Input'
import { Skeleton } from '../../../components/ui/Spinner'
import { EmptyState, ErrorState } from '../../../components/ui/States'
import { ConfirmDialog } from './_shared/ConfirmDialog'
import { Sheet } from '../../../components/ui/Modal'
import { Plus, Pill, Pencil, Trash2 } from 'lucide-react'
import type { SupplementItem } from '../../../types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SupplementEditorProps {
  traineeId: string
}

type SupplementFormState = {
  type: string
  category: string
  brand: string
  dosage: string
  timing: string
  instructions: string
  is_active: boolean
}

const DEFAULT_FORM: SupplementFormState = {
  type: '',
  category: '',
  brand: '',
  dosage: '',
  timing: '',
  instructions: '',
  is_active: true,
}

const TIMING_OPTIONS = [
  'Morning',
  'Pre-Workout',
  'Post-Workout',
  'With Meals',
  'Evening',
  'Before Bed',
  'Anytime',
]

const CATEGORY_OPTIONS = [
  'protein',
  'creatine',
  'pre_workout',
  'bcaa',
  'vitamins',
  'omega3',
  'fiber',
  'collagen',
  'fat_burner',
  'other',
]

function catDisplay(cat: string | null): string {
  if (!cat) return 'Supplement'
  return cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// ─── Edit Sheet ───────────────────────────────────────────────────────────────

function SupplementSheet({
  isOpen,
  onClose,
  initial,
  planId,
  existingId,
}: {
  isOpen: boolean
  onClose: () => void
  initial: SupplementFormState
  planId: string
  existingId?: string
}) {
  const [form, setForm] = useState<SupplementFormState>(initial)
  const [formError, setFormError] = useState<string | null>(null)
  const upsert = useUpsertSupplementItem()

  useEffect(() => {
    if (isOpen) {
      setForm(initial)
      setFormError(null)
    }
  }, [isOpen, initial])

  function set(field: keyof SupplementFormState, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    if (!form.type.trim()) {
      setFormError('Type is required')
      return
    }
    setFormError(null)
    try {
      await upsert.mutateAsync({
        ...(existingId ? { id: existingId } : {}),
        plan_id: planId,
        type: form.type.trim(),
        category: form.category || null,
        brand: form.brand || null,
        dosage: form.dosage || null,
        timing: form.timing || null,
        instructions: form.instructions || null,
        is_active: form.is_active,
      } as Parameters<typeof upsert.mutateAsync>[0])
      onClose()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to save supplement')
    }
  }

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title={existingId ? 'Edit Supplement' : 'Add Supplement'}>
      <div className="flex flex-col gap-3">
        <Input
          label="Type *"
          value={form.type}
          onChange={(e) => set('type', e.target.value)}
          placeholder="e.g. Whey Protein, Creatine"
        />

        <div>
          <label className="text-sm font-medium text-text-secondary block mb-1">Category</label>
          <select
            value={form.category}
            onChange={(e) => set('category', e.target.value)}
            className="w-full h-[52px] bg-input-bg border border-border rounded-md px-4 text-text focus:outline-none focus:border-primary transition-colors"
          >
            <option value="">Select category…</option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>{catDisplay(c)}</option>
            ))}
          </select>
        </div>

        <Input
          label="Brand"
          value={form.brand}
          onChange={(e) => set('brand', e.target.value)}
          placeholder="e.g. Optimum Nutrition"
        />

        <Input
          label="Dosage"
          value={form.dosage}
          onChange={(e) => set('dosage', e.target.value)}
          placeholder="e.g. 25g, 5mg"
        />

        <div>
          <label className="text-sm font-medium text-text-secondary block mb-1">Timing</label>
          <select
            value={form.timing}
            onChange={(e) => set('timing', e.target.value)}
            className="w-full h-[52px] bg-input-bg border border-border rounded-md px-4 text-text focus:outline-none focus:border-primary transition-colors"
          >
            <option value="">Select timing…</option>
            {TIMING_OPTIONS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <Textarea
          label="Instructions"
          value={form.instructions}
          onChange={(e) => set('instructions', e.target.value)}
          placeholder="How and when to take it…"
          rows={2}
        />

        <div className="flex items-center gap-3 py-1">
          <input
            id="supp-active"
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => set('is_active', e.target.checked)}
            className="w-5 h-5 accent-primary"
          />
          <label htmlFor="supp-active" className="text-sm text-text-secondary cursor-pointer">
            Active
          </label>
        </div>

        {formError && (
          <p className="text-error text-sm" role="alert">{formError}</p>
        )}

        <Button fullWidth onClick={handleSave} isLoading={upsert.isPending}>
          {existingId ? 'Save Changes' : 'Add Supplement'}
        </Button>
      </div>
    </Sheet>
  )
}

// ─── Supplement Item Card ─────────────────────────────────────────────────────

function SupplementCard({
  item,
  onEdit,
  onDelete,
}: {
  item: SupplementItem
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <Card className="mb-3">
      {/* Header */}
      <div className="flex items-start gap-3 mb-2">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Pill className="w-4 h-4 text-primary" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-text truncate">{catDisplay(item.category)}</p>
          <p className="text-xs text-text-secondary truncate">{item.type}</p>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button
            className="p-2 rounded-lg hover:bg-card-elevated text-text-tertiary hover:text-text transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            onClick={onEdit}
            aria-label={`Edit ${catDisplay(item.category)}`}
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            className="p-2 rounded-lg hover:bg-card-elevated text-text-tertiary hover:text-error transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            onClick={onDelete}
            aria-label={`Delete ${catDisplay(item.category)}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Details */}
      <div className="border-t border-divider pt-2 flex flex-col gap-1">
        {item.brand && <DetailRow label="Brand" value={item.brand} />}
        {item.dosage && <DetailRow label="Dosage" value={item.dosage} />}
        {item.timing && <DetailRow label="Timing" value={item.timing} />}
        {item.instructions && <DetailRow label="Usage" value={item.instructions} />}
        {!item.is_active && (
          <span className="text-xs text-warning font-semibold">Inactive</span>
        )}
      </div>
    </Card>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 min-w-0">
      <span className="text-xs text-text-tertiary flex-shrink-0 w-14">{label}</span>
      <span className="text-xs text-text min-w-0 break-words">{value}</span>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SupplementEditor({ traineeId }: SupplementEditorProps) {
  const planQ = useSupplementPlan(traineeId)
  const deleteItem = useDeleteSupplementItem()

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<SupplementItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SupplementItem | null>(null)

  function openAdd() {
    setEditTarget(null)
    setSheetOpen(true)
  }

  function openEdit(item: SupplementItem) {
    setEditTarget(item)
    setSheetOpen(true)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    await deleteItem.mutateAsync(deleteTarget.id)
    setDeleteTarget(null)
  }

  if (planQ.isLoading) {
    return (
      <div className="flex flex-col gap-3 p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
    )
  }

  if (planQ.isError) {
    return (
      <ErrorState
        message="Could not load supplement plan."
        onRetry={() => planQ.refetch()}
        className="py-12"
      />
    )
  }

  const data = planQ.data
  const items: SupplementItem[] = data?.items ?? []
  const planId = data?.plan?.id

  // Group by timing
  const grouped = new Map<string, SupplementItem[]>()
  for (const item of items) {
    const key = item.timing ?? 'Anytime'
    const arr = grouped.get(key) ?? []
    arr.push(item)
    grouped.set(key, arr)
  }

  const timingOrder = [
    'Morning', 'Pre-Workout', 'Post-Workout', 'With Meals', 'Evening', 'Before Bed', 'Anytime',
  ]
  const sortedKeys = [...grouped.keys()].sort((a, b) => {
    const ai = timingOrder.findIndex((t) => a.toLowerCase().includes(t.toLowerCase()))
    const bi = timingOrder.findIndex((t) => b.toLowerCase().includes(t.toLowerCase()))
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })

  return (
    <div className="flex flex-col p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-bold text-text">Supplements</h3>
          <p className="text-xs text-text-tertiary">{items.length} item{items.length !== 1 ? 's' : ''}</p>
        </div>
        <Button
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={openAdd}
          disabled={!planId}
        >
          Add
        </Button>
      </div>

      {!planId && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 mb-4">
          <p className="text-sm text-warning">
            No supplement plan exists yet for this trainee. A plan will be created automatically on first add.
          </p>
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon={<Pill className="w-7 h-7 text-text-tertiary" />}
          title="No Supplements Yet"
          description="Add supplements to this trainee's plan."
          action={planId ? { label: 'Add Supplement', onClick: openAdd } : undefined}
        />
      ) : (
        <div>
          {sortedKeys.map((timing) => (
            <div key={timing} className="mb-4">
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                {timing}
              </p>
              {grouped.get(timing)!.map((item) => (
                <SupplementCard
                  key={item.id}
                  item={item}
                  onEdit={() => openEdit(item)}
                  onDelete={() => setDeleteTarget(item)}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Sheet — only mount if we have a planId OR creating new */}
      <SupplementSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        initial={
          editTarget
            ? {
                type: editTarget.type,
                category: editTarget.category ?? '',
                brand: editTarget.brand ?? '',
                dosage: editTarget.dosage ?? '',
                timing: editTarget.timing ?? '',
                instructions: editTarget.instructions ?? '',
                is_active: editTarget.is_active,
              }
            : DEFAULT_FORM
        }
        planId={planId ?? ''}
        existingId={editTarget?.id}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Supplement?"
        description={`Remove "${catDisplay(deleteTarget?.category ?? null)}" from this plan?`}
        isLoading={deleteItem.isPending}
      />
    </div>
  )
}
