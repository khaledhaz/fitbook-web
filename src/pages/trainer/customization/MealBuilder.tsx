import React, { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  useMealPlans,
  useCreateMealPlan,
  useUpdateMealPlan,
  useDeleteMealPlan,
  useMeals,
  useCreateMeal,
  useUpdateMeal,
  useDeleteMeal,
  useMealVariations,
  useCreateMealVariation,
  useUpdateMealVariation,
  useMealVariationItems,
  useUpsertMealVariationItem,
  useRecomputeMealPlanMacros,
} from '../../../lib/api/meals'
import { Card, CardHeader, CardTitle } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Input, Textarea } from '../../../components/ui/Input'
import { Skeleton } from '../../../components/ui/Spinner'
import { EmptyState, ErrorState } from '../../../components/ui/States'
import { ConfirmDialog } from './_shared/ConfirmDialog'
import { MacroBar } from './_shared/MacroBar'
import { Sheet, Modal } from '../../../components/ui/Modal'
import {
  Plus,
  Utensils,
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  RefreshCw,
} from 'lucide-react'
import type { MealPlan, Meal, MealVariation, MealVariationItem } from '../../../types'
import { colors } from '../../../theme'
import { supabase } from '../../../lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MealBuilderProps {
  traineeId: string
}

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack', 'other']
const MEAL_TYPE_COLORS: Record<string, string> = {
  breakfast: colors.mealBreakfast,
  lunch: colors.mealLunch,
  dinner: colors.mealDinner,
  snack: colors.mealSnack,
  other: colors.textTertiary,
}

// ─── Plan selector / create ───────────────────────────────────────────────────

function PlanSelectBar({
  plans,
  activePlanId,
  onSelect,
  onCreate,
}: {
  plans: MealPlan[]
  activePlanId: string | null
  onSelect: (id: string) => void
  onCreate: () => void
}) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      {plans.map((p) => (
        <button
          key={p.id}
          onClick={() => onSelect(p.id)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border min-h-[44px] ${
            activePlanId === p.id
              ? 'bg-primary text-text-on-primary border-primary'
              : 'bg-card border-border text-text-secondary hover:border-primary hover:text-text'
          }`}
        >
          {p.title}
        </button>
      ))}
      <button
        onClick={onCreate}
        className="flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border border-dashed border-border text-text-tertiary hover:text-primary hover:border-primary transition-colors min-h-[44px]"
        aria-label="Create new meal plan"
      >
        + New Plan
      </button>
    </div>
  )
}

// ─── Plan form ────────────────────────────────────────────────────────────────

function PlanSheet({
  isOpen,
  onClose,
  traineeId,
  existing,
}: {
  isOpen: boolean
  onClose: () => void
  traineeId: string
  existing?: MealPlan | null
}) {
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const create = useCreateMealPlan()
  const update = useUpdateMealPlan()

  useEffect(() => {
    if (isOpen) {
      setTitle(existing?.title ?? '')
      setDesc(existing?.description ?? '')
      setErr(null)
    }
  }, [isOpen, existing])

  async function handleSave() {
    if (!title.trim()) { setErr('Title is required'); return }
    setErr(null)
    try {
      if (existing) {
        await update.mutateAsync({ id: existing.id, title: title.trim(), description: desc || null })
      } else {
        await create.mutateAsync({ trainee_id: traineeId, title: title.trim(), description: desc || null })
      }
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save plan')
    }
  }

  const isPending = create.isPending || update.isPending

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title={existing ? 'Edit Plan' : 'New Meal Plan'}>
      <div className="flex flex-col gap-3">
        <Input label="Plan Title *" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Bulk Phase" />
        <Textarea label="Description" value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} />
        {err && <p className="text-error text-sm" role="alert">{err}</p>}
        <Button fullWidth onClick={handleSave} isLoading={isPending}>
          {existing ? 'Save Changes' : 'Create Plan'}
        </Button>
      </div>
    </Sheet>
  )
}

// ─── Meal form ────────────────────────────────────────────────────────────────

function MealSheet({
  isOpen,
  onClose,
  planId,
  existing,
  nextOrder,
}: {
  isOpen: boolean
  onClose: () => void
  planId: string
  existing?: Meal | null
  nextOrder: number
}) {
  const [name, setName] = useState('')
  const [mealType, setMealType] = useState('other')
  const [time, setTime] = useState('')
  const [notes, setNotes] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const create = useCreateMeal()
  const update = useUpdateMeal()

  useEffect(() => {
    if (isOpen) {
      setName(existing?.name ?? '')
      setMealType(existing?.meal_type ?? 'other')
      setTime(existing?.target_time ?? '')
      setNotes(existing?.notes ?? '')
      setErr(null)
    }
  }, [isOpen, existing])

  async function handleSave() {
    if (!name.trim()) { setErr('Name is required'); return }
    setErr(null)
    try {
      if (existing) {
        await update.mutateAsync({ id: existing.id, name: name.trim(), meal_type: mealType, target_time: time || null, notes: notes || null })
      } else {
        await create.mutateAsync({ meal_plan_id: planId, name: name.trim(), meal_type: mealType, sort_order: nextOrder, target_time: time || null, notes: notes || null })
      }
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save meal')
    }
  }

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title={existing ? 'Edit Meal' : 'Add Meal'}>
      <div className="flex flex-col gap-3">
        <Input label="Meal Name *" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Breakfast" />
        <div>
          <label className="text-sm font-medium text-text-secondary block mb-1">Type</label>
          <select value={mealType} onChange={(e) => setMealType(e.target.value)}
            className="w-full h-[52px] bg-input-bg border border-border rounded-md px-4 text-text focus:outline-none focus:border-primary transition-colors">
            {MEAL_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
        </div>
        <Input label="Target Time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        {err && <p className="text-error text-sm" role="alert">{err}</p>}
        <Button fullWidth onClick={handleSave} isLoading={create.isPending || update.isPending}>
          {existing ? 'Save Changes' : 'Add Meal'}
        </Button>
      </div>
    </Sheet>
  )
}

// ─── Variation form ───────────────────────────────────────────────────────────

function VariationSheet({
  isOpen,
  onClose,
  mealId,
  existing,
  nextOrder,
}: {
  isOpen: boolean
  onClose: () => void
  mealId: string
  existing?: MealVariation | null
  nextOrder: number
}) {
  const [label, setLabel] = useState('')
  const [isDefault, setIsDefault] = useState(false)
  const [notes, setNotes] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const create = useCreateMealVariation()
  const update = useUpdateMealVariation()

  useEffect(() => {
    if (isOpen) {
      setLabel(existing?.label ?? '')
      setIsDefault(existing?.is_default ?? false)
      setNotes(existing?.notes ?? '')
      setErr(null)
    }
  }, [isOpen, existing])

  async function handleSave() {
    if (!label.trim()) { setErr('Label is required'); return }
    setErr(null)
    try {
      if (existing) {
        await update.mutateAsync({ id: existing.id, label: label.trim(), is_default: isDefault, notes: notes || null })
      } else {
        await create.mutateAsync({ meal_id: mealId, label: label.trim(), sort_order: nextOrder, is_default: isDefault, notes: notes || null })
      }
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save variation')
    }
  }

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title={existing ? 'Edit Variation' : 'Add Variation'}>
      <div className="flex flex-col gap-3">
        <Input label="Label *" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Option A, High Carb" />
        <div className="flex items-center gap-3 py-1">
          <input id="var-default" type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="w-5 h-5 accent-primary" />
          <label htmlFor="var-default" className="text-sm text-text-secondary cursor-pointer">Default variation</label>
        </div>
        <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        {err && <p className="text-error text-sm" role="alert">{err}</p>}
        <Button fullWidth onClick={handleSave} isLoading={create.isPending || update.isPending}>
          {existing ? 'Save Changes' : 'Add Variation'}
        </Button>
      </div>
    </Sheet>
  )
}

// ─── Item form ────────────────────────────────────────────────────────────────

type ItemFormState = {
  name: string
  quantity: string
  unit: string
  calories: string
  protein: string
  carbs: string
  fat: string
  fiber: string
  notes: string
}

const DEFAULT_ITEM: ItemFormState = { name: '', quantity: '1', unit: 'g', calories: '', protein: '', carbs: '', fat: '', fiber: '', notes: '' }

function ItemModal({
  isOpen,
  onClose,
  variationId,
  existing,
  nextOrder,
}: {
  isOpen: boolean
  onClose: () => void
  variationId: string
  existing?: MealVariationItem | null
  nextOrder: number
}) {
  const [form, setForm] = useState<ItemFormState>(DEFAULT_ITEM)
  const [err, setErr] = useState<string | null>(null)
  const upsert = useUpsertMealVariationItem()

  useEffect(() => {
    if (isOpen) {
      setForm(
        existing
          ? {
              name: existing.name,
              quantity: String(existing.quantity),
              unit: existing.unit,
              calories: existing.calories != null ? String(existing.calories) : '',
              protein: existing.protein != null ? String(existing.protein) : '',
              carbs: existing.carbs != null ? String(existing.carbs) : '',
              fat: existing.fat != null ? String(existing.fat) : '',
              fiber: existing.fiber != null ? String(existing.fiber) : '',
              notes: existing.notes ?? '',
            }
          : DEFAULT_ITEM,
      )
      setErr(null)
    }
  }, [isOpen, existing])

  function set(field: keyof ItemFormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    if (!form.name.trim()) { setErr('Name is required'); return }
    if (!form.quantity || isNaN(parseFloat(form.quantity))) { setErr('Valid quantity required'); return }
    setErr(null)
    try {
      await upsert.mutateAsync({
        ...(existing ? { id: existing.id } : {}),
        meal_variation_id: variationId,
        name: form.name.trim(),
        quantity: parseFloat(form.quantity),
        unit: form.unit || 'g',
        calories: form.calories ? parseFloat(form.calories) : null,
        protein: form.protein ? parseFloat(form.protein) : null,
        carbs: form.carbs ? parseFloat(form.carbs) : null,
        fat: form.fat ? parseFloat(form.fat) : null,
        fiber: form.fiber ? parseFloat(form.fiber) : null,
        notes: form.notes || null,
        sort_order: existing?.sort_order ?? nextOrder,
      })
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save item')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={existing ? 'Edit Item' : 'Add Food Item'} size="md">
      <div className="flex flex-col gap-3 overflow-y-auto max-h-[60vh]">
        <Input label="Name *" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Chicken Breast" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Quantity *" type="number" min="0" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} />
          <Input label="Unit" value={form.unit} onChange={(e) => set('unit', e.target.value)} placeholder="g, ml, oz…" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Calories (kcal)" type="number" min="0" value={form.calories} onChange={(e) => set('calories', e.target.value)} />
          <Input label="Protein (g)" type="number" min="0" value={form.protein} onChange={(e) => set('protein', e.target.value)} style={{ color: colors.macroProtein }} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Carbs (g)" type="number" min="0" value={form.carbs} onChange={(e) => set('carbs', e.target.value)} />
          <Input label="Fat (g)" type="number" min="0" value={form.fat} onChange={(e) => set('fat', e.target.value)} />
        </div>
        <Input label="Fiber (g)" type="number" min="0" value={form.fiber} onChange={(e) => set('fiber', e.target.value)} />
        <Textarea label="Notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} />
        {err && <p className="text-error text-sm" role="alert">{err}</p>}
        <Button fullWidth onClick={handleSave} isLoading={upsert.isPending}>
          {existing ? 'Save Changes' : 'Add Item'}
        </Button>
      </div>
    </Modal>
  )
}

// ─── Variation section ────────────────────────────────────────────────────────

function VariationSection({
  variation,
  onEdit,
  onDelete,
}: {
  variation: MealVariation
  onEdit: () => void
  onDelete: () => void
}) {
  const itemsQ = useMealVariationItems(variation.id)
  const deleteItemRpc = useDeleteItemLocal()
  const [itemModal, setItemModal] = useState(false)
  const [editItem, setEditItem] = useState<MealVariationItem | null>(null)
  const [deleteItem, setDeleteItemTarget] = useState<MealVariationItem | null>(null)
  const [expanded, setExpanded] = useState(true)

  function openAddItem() {
    setEditItem(null)
    setItemModal(true)
  }
  function openEditItem(item: MealVariationItem) {
    setEditItem(item)
    setItemModal(true)
  }

  const items = itemsQ.data ?? []
  const nextOrder = items.length

  return (
    <div className="border border-border rounded-lg overflow-hidden mb-2">
      {/* Variation header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-card-elevated">
        <button
          className="flex items-center gap-2 flex-1 text-left min-w-0 min-h-[44px]"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          {expanded
            ? <ChevronDown className="w-4 h-4 text-text-tertiary flex-shrink-0" />
            : <ChevronRight className="w-4 h-4 text-text-tertiary flex-shrink-0" />
          }
          <span className="text-sm font-semibold text-text truncate min-w-0">{variation.label}</span>
          {variation.is_default && (
            <span className="ml-1 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full flex-shrink-0">Default</span>
          )}
        </button>
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={onEdit} aria-label={`Edit variation ${variation.label}`}
            className="p-1.5 rounded hover:bg-card text-text-tertiary hover:text-text transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete} aria-label={`Delete variation ${variation.label}`}
            className="p-1.5 rounded hover:bg-card text-text-tertiary hover:text-error transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="p-3 bg-card">
          {/* Macros */}
          {(variation.total_calories != null || variation.total_protein != null) && (
            <div className="mb-3">
              <MacroBar
                calories={variation.total_calories}
                protein={variation.total_protein}
                carbs={variation.total_carbs}
                fat={variation.total_fat}
                compact
              />
            </div>
          )}

          {/* Items */}
          {itemsQ.isLoading ? (
            <Skeleton className="h-8 rounded" />
          ) : items.length === 0 ? (
            <p className="text-xs text-text-tertiary py-2">No food items yet.</p>
          ) : (
            <div className="flex flex-col gap-1 mb-2">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-2 py-1.5 border-b border-divider last:border-0 min-w-0">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-text truncate block">{item.name}</span>
                    <span className="text-xs text-text-tertiary">
                      {item.quantity}{item.unit}
                      {item.calories != null ? ` · ${Math.round(item.calories)} kcal` : ''}
                    </span>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => openEditItem(item)} aria-label={`Edit ${item.name}`}
                      className="p-1.5 rounded text-text-tertiary hover:text-text transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button onClick={() => setDeleteItemTarget(item)} aria-label={`Delete ${item.name}`}
                      className="p-1.5 rounded text-text-tertiary hover:text-error transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={openAddItem}
            className="text-xs text-primary hover:text-primary-light font-semibold flex items-center gap-1 min-h-[44px]"
          >
            <Plus className="w-3 h-3" />
            Add Food Item
          </button>
        </div>
      )}

      <ItemModal
        isOpen={itemModal}
        onClose={() => setItemModal(false)}
        variationId={variation.id}
        existing={editItem}
        nextOrder={nextOrder}
      />
      <ConfirmDialog
        isOpen={!!deleteItem}
        onClose={() => setDeleteItemTarget(null)}
        onConfirm={async () => {
          if (deleteItem) {
            await deleteItemRpc(deleteItem.id)
            setDeleteItemTarget(null)
          }
        }}
        title="Delete Item?"
        description={`Remove "${deleteItem?.name}" from this variation?`}
      />
    </div>
  )
}

// Local delete item helper (direct table delete since no RPC for meal_variation_items)
function useDeleteItemLocal() {
  const qc = useQueryClient()
  return async (id: string) => {
    const { error } = await supabase.from('meal_variation_items').delete().eq('id', id)
    if (error) throw error
    qc.invalidateQueries({ queryKey: ['meal_variation_items'] })
  }
}

// ─── Meal section ─────────────────────────────────────────────────────────────

function MealSection({
  meal,
  onEdit,
  onDelete,
}: {
  meal: Meal
  onEdit: () => void
  onDelete: () => void
}) {
  const varsQ = useMealVariations(meal.id)
  const deleteVar = useDeleteVariationLocal()
  const [varSheet, setVarSheet] = useState(false)
  const [editVar, setEditVar] = useState<MealVariation | null>(null)
  const [deleteVar2, setDeleteVar2] = useState<MealVariation | null>(null)
  const [expanded, setExpanded] = useState(true)

  const variations = varsQ.data ?? []
  const typeColor = MEAL_TYPE_COLORS[meal.meal_type] ?? colors.textTertiary

  function openAddVar() {
    setEditVar(null)
    setVarSheet(true)
  }
  function openEditVar(v: MealVariation) {
    setEditVar(v)
    setVarSheet(true)
  }

  return (
    <Card className="mb-3">
      {/* Meal header */}
      <div className="flex items-center gap-2 mb-2 min-w-0">
        <button
          className="flex items-center gap-2 flex-1 text-left min-w-0 min-h-[44px]"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: typeColor }} aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <span className="text-base font-bold text-text truncate block">{meal.name}</span>
            {meal.target_time && <span className="text-xs text-text-tertiary">{meal.target_time}</span>}
          </div>
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full capitalize flex-shrink-0"
            style={{ color: typeColor, backgroundColor: `${typeColor}22` }}
          >
            {meal.meal_type}
          </span>
          {expanded
            ? <ChevronDown className="w-4 h-4 text-text-tertiary flex-shrink-0" />
            : <ChevronRight className="w-4 h-4 text-text-tertiary flex-shrink-0" />
          }
        </button>
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={onEdit} aria-label={`Edit meal ${meal.name}`}
            className="p-2 rounded-lg hover:bg-card-elevated text-text-tertiary hover:text-text transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={onDelete} aria-label={`Delete meal ${meal.name}`}
            className="p-2 rounded-lg hover:bg-card-elevated text-text-tertiary hover:text-error transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {expanded && (
        <>
          {varsQ.isLoading ? (
            <Skeleton className="h-12 rounded" />
          ) : variations.length === 0 ? (
            <p className="text-xs text-text-tertiary mb-2">No variations yet.</p>
          ) : (
            <div className="mb-2">
              {variations.map((v) => (
                <VariationSection
                  key={v.id}
                  variation={v}
                  onEdit={() => openEditVar(v)}
                  onDelete={() => setDeleteVar2(v)}
                />
              ))}
            </div>
          )}
          <button
            onClick={openAddVar}
            className="text-xs text-primary hover:text-primary-light font-semibold flex items-center gap-1 min-h-[44px]"
          >
            <Plus className="w-3 h-3" />
            Add Variation
          </button>
        </>
      )}

      <VariationSheet
        isOpen={varSheet}
        onClose={() => setVarSheet(false)}
        mealId={meal.id}
        existing={editVar}
        nextOrder={variations.length}
      />
      <ConfirmDialog
        isOpen={!!deleteVar2}
        onClose={() => setDeleteVar2(null)}
        onConfirm={async () => {
          if (deleteVar2) {
            await deleteVar(deleteVar2.id)
            setDeleteVar2(null)
          }
        }}
        title="Delete Variation?"
        description={`Remove variation "${deleteVar2?.label}" and all its items?`}
      />
    </Card>
  )
}

// Local delete variation helper
function useDeleteVariationLocal() {
  const qc = useQueryClient()
  return async (id: string) => {
    const { error } = await supabase.from('meal_variations').delete().eq('id', id)
    if (error) throw error
    qc.invalidateQueries({ queryKey: ['meal_variations'] })
  }
}

// ─── Active plan view ─────────────────────────────────────────────────────────

function ActivePlanView({
  plan,
  onEditPlan,
  onDeletePlan,
}: {
  plan: MealPlan
  onEditPlan: () => void
  onDeletePlan: () => void
}) {
  const mealsQ = useMeals(plan.id)
  const recompute = useRecomputeMealPlanMacros()
  const deleteMealRpc = useDeleteMealLocal()
  const [mealSheet, setMealSheet] = useState(false)
  const [editMeal, setEditMeal] = useState<Meal | null>(null)
  const [deleteMeal, setDeleteMeal] = useState<Meal | null>(null)

  const meals = mealsQ.data ?? []

  function openAddMeal() {
    setEditMeal(null)
    setMealSheet(true)
  }
  function openEditMeal(m: Meal) {
    setEditMeal(m)
    setMealSheet(true)
  }

  return (
    <div>
      {/* Plan header */}
      <Card elevated className="mb-4">
        <CardHeader>
          <div className="min-w-0">
            <CardTitle className="truncate">{plan.title}</CardTitle>
            {plan.description && (
              <p className="text-xs text-text-tertiary mt-0.5 truncate">{plan.description}</p>
            )}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => recompute.mutate(plan.id)}
              className="p-2 rounded-lg hover:bg-card text-text-tertiary hover:text-primary transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Recompute macros"
              title="Recompute macros"
            >
              <RefreshCw className={`w-4 h-4 ${recompute.isPending ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onEditPlan} aria-label="Edit plan"
              className="p-2 rounded-lg hover:bg-card text-text-tertiary hover:text-text transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
              <Pencil className="w-4 h-4" />
            </button>
            <button onClick={onDeletePlan} aria-label="Delete plan"
              className="p-2 rounded-lg hover:bg-card text-text-tertiary hover:text-error transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </CardHeader>

        {/* Plan-level macros */}
        {(plan.total_calories != null || plan.total_protein != null) && (
          <MacroBar
            calories={plan.total_calories}
            protein={plan.total_protein}
            carbs={plan.total_carbs}
            fat={plan.total_fat}
          />
        )}
      </Card>

      {/* Meals */}
      {mealsQ.isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
      ) : mealsQ.isError ? (
        <ErrorState message="Could not load meals." onRetry={() => mealsQ.refetch()} />
      ) : meals.length === 0 ? (
        <EmptyState
          icon={<Utensils className="w-7 h-7 text-text-tertiary" />}
          title="No Meals"
          description="Add meals to this plan."
          action={{ label: 'Add Meal', onClick: openAddMeal }}
        />
      ) : (
        <div>
          {meals.map((m) => (
            <MealSection
              key={m.id}
              meal={m}
              onEdit={() => openEditMeal(m)}
              onDelete={() => setDeleteMeal(m)}
            />
          ))}
          <Button size="sm" variant="secondary" fullWidth leftIcon={<Plus className="w-4 h-4" />} onClick={openAddMeal} className="mt-2">
            Add Meal
          </Button>
        </div>
      )}

      <MealSheet
        isOpen={mealSheet}
        onClose={() => setMealSheet(false)}
        planId={plan.id}
        existing={editMeal}
        nextOrder={meals.length}
      />
      <ConfirmDialog
        isOpen={!!deleteMeal}
        onClose={() => setDeleteMeal(null)}
        onConfirm={async () => {
          if (deleteMeal) {
            await deleteMealRpc(deleteMeal.id, plan.id)
            setDeleteMeal(null)
          }
        }}
        title="Delete Meal?"
        description={`Remove "${deleteMeal?.name}" and all its variations?`}
      />
    </div>
  )
}

function useDeleteMealLocal() {
  const qc = useQueryClient()
  return async (id: string, planId: string) => {
    const { error } = await supabase.from('meals').delete().eq('id', id)
    if (error) throw error
    qc.invalidateQueries({ queryKey: ['meals', planId] })
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function MealBuilder({ traineeId }: MealBuilderProps) {
  const plansQ = useMealPlans(traineeId)
  const deletePlan = useDeleteMealPlan()

  const [activePlanId, setActivePlanId] = useState<string | null>(null)
  const [planSheet, setPlanSheet] = useState(false)
  const [editPlan, setEditPlan] = useState<MealPlan | null>(null)
  const [deletePlanTarget, setDeletePlanTarget] = useState<MealPlan | null>(null)

  const plans = plansQ.data ?? []

  // Auto-select first plan
  useEffect(() => {
    if (plans.length > 0 && !activePlanId) {
      setActivePlanId(plans[0].id)
    }
    if (plans.length === 0) setActivePlanId(null)
  }, [plans, activePlanId])

  const activePlan = plans.find((p) => p.id === activePlanId) ?? null

  function openCreate() {
    setEditPlan(null)
    setPlanSheet(true)
  }
  function openEdit(p: MealPlan) {
    setEditPlan(p)
    setPlanSheet(true)
  }

  if (plansQ.isLoading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <Skeleton className="h-10 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-20 rounded-lg" />
      </div>
    )
  }

  if (plansQ.isError) {
    return <ErrorState message="Could not load meal plans." onRetry={() => plansQ.refetch()} className="py-12" />
  }

  return (
    <div className="flex flex-col p-4">
      {/* Plan selector */}
      <div className="mb-4">
        <PlanSelectBar
          plans={plans}
          activePlanId={activePlanId}
          onSelect={setActivePlanId}
          onCreate={openCreate}
        />
      </div>

      {/* Plan content */}
      {activePlan ? (
        <ActivePlanView
          plan={activePlan}
          onEditPlan={() => openEdit(activePlan)}
          onDeletePlan={() => setDeletePlanTarget(activePlan)}
        />
      ) : (
        <EmptyState
          icon={<Utensils className="w-7 h-7 text-text-tertiary" />}
          title="No Meal Plans"
          description="Create the first meal plan for this trainee."
          action={{ label: 'Create Meal Plan', onClick: openCreate }}
        />
      )}

      <PlanSheet
        isOpen={planSheet}
        onClose={() => setPlanSheet(false)}
        traineeId={traineeId}
        existing={editPlan}
      />

      <ConfirmDialog
        isOpen={!!deletePlanTarget}
        onClose={() => setDeletePlanTarget(null)}
        onConfirm={async () => {
          if (deletePlanTarget) {
            await deletePlan.mutateAsync({ id: deletePlanTarget.id, traineeId })
            if (activePlanId === deletePlanTarget.id) setActivePlanId(null)
            setDeletePlanTarget(null)
          }
        }}
        title="Delete Meal Plan?"
        description={`Delete "${deletePlanTarget?.title}" and all its meals? This cannot be undone.`}
        isLoading={deletePlan.isPending}
      />
    </div>
  )
}
