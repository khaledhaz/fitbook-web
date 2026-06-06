import React, { useEffect, useState } from 'react'
import {
  useWorkoutPlans,
  useCreateWorkoutPlan,
  useUpdateWorkoutPlan,
  useDeleteWorkoutPlan,
  useWorkoutDays,
  useCreateWorkoutDay,
  useUpdateWorkoutDay,
  useDeleteWorkoutDay,
  useWorkoutDayExercises,
  useCreateWorkoutDayExercise,
  useUpdateWorkoutDayExercise,
  useDeleteWorkoutDayExercise,
  useBulkReorderExercises,
  useExercises,
} from '../../../lib/api/workouts'
import { Card, CardHeader, CardTitle } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Input, Textarea } from '../../../components/ui/Input'
import { Skeleton } from '../../../components/ui/Spinner'
import { EmptyState, ErrorState } from '../../../components/ui/States'
import { ConfirmDialog } from './_shared/ConfirmDialog'
import { Sheet, Modal } from '../../../components/ui/Modal'
import {
  Plus,
  Dumbbell,
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  GripVertical,
  Search,
} from 'lucide-react'
import type {
  WorkoutPlan,
  WorkoutDay,
  WorkoutDayExercise,
  Exercise,
} from '../../../types'
import { supabase } from '../../../lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkoutBuilderProps {
  traineeId: string
}

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

// ─── Plan selector / create ───────────────────────────────────────────────────

function PlanSelectBar({
  plans,
  activePlanId,
  onSelect,
  onCreate,
}: {
  plans: WorkoutPlan[]
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
        aria-label="Create new workout plan"
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
  existing?: WorkoutPlan | null
}) {
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [startsOn, setStartsOn] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const create = useCreateWorkoutPlan()
  const update = useUpdateWorkoutPlan()

  useEffect(() => {
    if (isOpen) {
      setTitle(existing?.title ?? '')
      setDesc(existing?.description ?? '')
      setStartsOn(existing?.starts_on ?? '')
      setErr(null)
    }
  }, [isOpen, existing])

  async function handleSave() {
    if (!title.trim()) { setErr('Title is required'); return }
    setErr(null)
    try {
      if (existing) {
        await update.mutateAsync({ id: existing.id, title: title.trim(), description: desc || null, starts_on: startsOn || null })
      } else {
        await create.mutateAsync({ trainee_id: traineeId, title: title.trim(), description: desc || null, starts_on: startsOn || null })
      }
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save plan')
    }
  }

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title={existing ? 'Edit Plan' : 'New Workout Plan'}>
      <div className="flex flex-col gap-3">
        <Input label="Plan Title *" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Push Pull Legs" />
        <Textarea label="Description" value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} />
        <Input label="Starts On" type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
        {err && <p className="text-error text-sm" role="alert">{err}</p>}
        <Button fullWidth onClick={handleSave} isLoading={create.isPending || update.isPending}>
          {existing ? 'Save Changes' : 'Create Plan'}
        </Button>
      </div>
    </Sheet>
  )
}

// ─── Day form ─────────────────────────────────────────────────────────────────

function DaySheet({
  isOpen,
  onClose,
  planId,
  existing,
  nextIndex,
}: {
  isOpen: boolean
  onClose: () => void
  planId: string
  existing?: WorkoutDay | null
  nextIndex: number
}) {
  const [dayIndex, setDayIndex] = useState(0)
  const [title, setTitle] = useState('')
  const [dayType, setDayType] = useState('')
  const [notes, setNotes] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const create = useCreateWorkoutDay()
  const update = useUpdateWorkoutDay()

  useEffect(() => {
    if (isOpen) {
      setDayIndex(existing?.day_index ?? nextIndex)
      setTitle(existing?.title ?? '')
      setDayType(existing?.day_type ?? '')
      setNotes(existing?.notes ?? '')
      setErr(null)
    }
  }, [isOpen, existing, nextIndex])

  async function handleSave() {
    setErr(null)
    try {
      if (existing) {
        await update.mutateAsync({ id: existing.id, day_index: dayIndex, title: title || null, day_type: dayType || null, notes: notes || null })
      } else {
        await create.mutateAsync({ workout_plan_id: planId, day_index: dayIndex, title: title || null, day_type: dayType || null, notes: notes || null })
      }
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save day')
    }
  }

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title={existing ? 'Edit Day' : 'Add Day'}>
      <div className="flex flex-col gap-3">
        <div>
          <label className="text-sm font-medium text-text-secondary block mb-1">Day</label>
          <select
            value={dayIndex}
            onChange={(e) => setDayIndex(parseInt(e.target.value))}
            className="w-full h-[52px] bg-input-bg border border-border rounded-md px-4 text-text focus:outline-none focus:border-primary transition-colors"
          >
            {DAY_NAMES.map((name, i) => <option key={i} value={i}>{name}</option>)}
          </select>
        </div>
        <Input label="Title / Focus" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Push Day" />
        <Input label="Day Type" value={dayType} onChange={(e) => setDayType(e.target.value)} placeholder="e.g. Upper, Lower, Full Body" />
        <Textarea label="Notes / Warmup" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        {err && <p className="text-error text-sm" role="alert">{err}</p>}
        <Button fullWidth onClick={handleSave} isLoading={create.isPending || update.isPending}>
          {existing ? 'Save Changes' : 'Add Day'}
        </Button>
      </div>
    </Sheet>
  )
}

// ─── Exercise search modal ────────────────────────────────────────────────────

function ExercisePickerModal({
  isOpen,
  onClose,
  onPick,
}: {
  isOpen: boolean
  onClose: () => void
  onPick: (ex: Exercise) => void
}) {
  const [search, setSearch] = useState('')
  const exQ = useExercises(search || undefined)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Search Exercises" size="lg">
      <div className="flex flex-col gap-3">
        <Input
          label=""
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search exercises…"
          leftIcon={<Search className="w-4 h-4" />}
        />
        <div className="overflow-y-auto max-h-[50vh] flex flex-col gap-1">
          {exQ.isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)
          ) : exQ.data?.length === 0 ? (
            <p className="text-text-secondary text-sm text-center py-8">No exercises found.</p>
          ) : (
            exQ.data?.map((ex) => (
              <button
                key={ex.id}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-card-elevated text-left transition-colors border border-border min-h-[44px]"
                onClick={() => {
                  onPick(ex)
                  onClose()
                }}
              >
                {ex.thumbnail_url ? (
                  <img src={ex.thumbnail_url} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" loading="lazy" />
                ) : (
                  <div className="w-10 h-10 rounded bg-card-elevated flex items-center justify-center flex-shrink-0">
                    <Dumbbell className="w-5 h-5 text-text-tertiary" aria-hidden="true" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text truncate">{ex.name}</p>
                  {ex.body_part && ex.body_part.length > 0 && (
                    <p className="text-xs text-text-tertiary truncate">{ex.body_part.join(', ')}</p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </Modal>
  )
}

// ─── Exercise edit form ───────────────────────────────────────────────────────

type ExerciseFormState = {
  sets: string
  reps: string
  rest_seconds: string
  tempo: string
  notes: string
  is_warmup: boolean
}

function ExerciseSheet({
  isOpen,
  onClose,
  dayId,
  exerciseId,
  exerciseName,
  existing,
  nextOrder,
}: {
  isOpen: boolean
  onClose: () => void
  dayId: string
  exerciseId: string
  exerciseName: string
  existing?: WorkoutDayExercise | null
  nextOrder: number
}) {
  const [form, setForm] = useState<ExerciseFormState>({ sets: '3', reps: '10', rest_seconds: '60', tempo: '', notes: '', is_warmup: false })
  const [err, setErr] = useState<string | null>(null)
  const create = useCreateWorkoutDayExercise()
  const update = useUpdateWorkoutDayExercise()

  useEffect(() => {
    if (isOpen) {
      setForm(
        existing
          ? {
              sets: String(existing.sets),
              reps: existing.reps_data ? JSON.stringify(existing.reps_data) : '10',
              rest_seconds: existing.rest_seconds != null ? String(existing.rest_seconds) : '60',
              tempo: existing.tempo ?? '',
              notes: existing.notes ?? '',
              is_warmup: existing.is_warmup,
            }
          : { sets: '3', reps: '10', rest_seconds: '60', tempo: '', notes: '', is_warmup: false },
      )
      setErr(null)
    }
  }, [isOpen, existing])

  function set(field: keyof ExerciseFormState, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    const sets = parseInt(form.sets)
    if (isNaN(sets) || sets < 1) { setErr('Sets must be >= 1'); return }
    setErr(null)

    // Parse reps: could be a number or a JSON array/object
    let reps_data: Record<string, unknown> | null = null
    const repsNum = parseInt(form.reps)
    if (!isNaN(repsNum)) {
      reps_data = { default: repsNum }
    } else {
      try {
        reps_data = JSON.parse(form.reps)
      } catch {
        reps_data = null
      }
    }

    try {
      if (existing) {
        await update.mutateAsync({
          id: existing.id,
          sets,
          reps_data,
          rest_seconds: form.rest_seconds ? parseInt(form.rest_seconds) : null,
          tempo: form.tempo || null,
          notes: form.notes || null,
          is_warmup: form.is_warmup,
        })
      } else {
        await create.mutateAsync({
          workout_day_id: dayId,
          exercise_id: exerciseId,
          sets,
          reps_data,
          rest_seconds: form.rest_seconds ? parseInt(form.rest_seconds) : null,
          tempo: form.tempo || null,
          notes: form.notes || null,
          is_warmup: form.is_warmup,
          exercise_order: nextOrder,
        })
      }
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save exercise')
    }
  }

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title={`${existing ? 'Edit' : 'Add'}: ${exerciseName}`}>
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Sets *" type="number" min="1" value={form.sets} onChange={(e) => set('sets', e.target.value)} />
          <Input label="Reps" type="number" min="1" value={form.reps} onChange={(e) => set('reps', e.target.value)} hint="Number or JSON" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Rest (sec)" type="number" min="0" value={form.rest_seconds} onChange={(e) => set('rest_seconds', e.target.value)} />
          <Input label="Tempo" value={form.tempo} onChange={(e) => set('tempo', e.target.value)} placeholder="e.g. 3-1-1-0" />
        </div>
        <Textarea label="Notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} />
        <div className="flex items-center gap-3 py-1">
          <input id="ex-warmup" type="checkbox" checked={form.is_warmup} onChange={(e) => set('is_warmup', e.target.checked)} className="w-5 h-5 accent-primary" />
          <label htmlFor="ex-warmup" className="text-sm text-text-secondary cursor-pointer">Warmup exercise</label>
        </div>
        {err && <p className="text-error text-sm" role="alert">{err}</p>}
        <Button fullWidth onClick={handleSave} isLoading={create.isPending || update.isPending}>
          {existing ? 'Save Changes' : 'Add Exercise'}
        </Button>
      </div>
    </Sheet>
  )
}

// ─── Exercise row ─────────────────────────────────────────────────────────────

function ExerciseRow({
  item,
  index,
  total,
  onEdit,
  onDelete,
  onMove,
}: {
  item: WorkoutDayExercise & { exercises: Exercise }
  index: number
  total: number
  onEdit: () => void
  onDelete: () => void
  onMove: (dir: 'up' | 'down') => void
}) {
  const repsDisplay = (() => {
    if (!item.reps_data) return '—'
    const d = item.reps_data as Record<string, unknown>
    if ('default' in d) return String(d.default)
    return JSON.stringify(d)
  })()

  return (
    <div className="flex items-center gap-2 py-2 border-b border-divider last:border-0 min-w-0">
      {/* Reorder buttons */}
      <div className="flex flex-col gap-0.5 flex-shrink-0">
        <button
          onClick={() => onMove('up')}
          disabled={index === 0}
          className="text-text-tertiary hover:text-text disabled:opacity-30 p-0.5 min-w-[24px] min-h-[24px] flex items-center justify-center"
          aria-label="Move exercise up"
        >
          ▲
        </button>
        <button
          onClick={() => onMove('down')}
          disabled={index === total - 1}
          className="text-text-tertiary hover:text-text disabled:opacity-30 p-0.5 min-w-[24px] min-h-[24px] flex items-center justify-center"
          aria-label="Move exercise down"
        >
          ▼
        </button>
      </div>

      <GripVertical className="w-4 h-4 text-text-tertiary flex-shrink-0" aria-hidden="true" />

      {/* Exercise info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text truncate">
          {item.custom_name ?? item.exercises?.name ?? 'Unknown Exercise'}
          {item.is_warmup && <span className="ml-2 text-xs text-warning">(warmup)</span>}
        </p>
        <p className="text-xs text-text-tertiary">
          {item.sets} sets × {repsDisplay} reps
          {item.rest_seconds ? ` · ${item.rest_seconds}s rest` : ''}
          {item.tempo ? ` · ${item.tempo}` : ''}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-1 flex-shrink-0">
        <button onClick={onEdit} aria-label={`Edit ${item.exercises?.name ?? 'exercise'}`}
          className="p-2 rounded text-text-tertiary hover:text-text transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button onClick={onDelete} aria-label={`Delete ${item.exercises?.name ?? 'exercise'}`}
          className="p-2 rounded text-text-tertiary hover:text-error transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ─── Day section ──────────────────────────────────────────────────────────────

function DaySection({
  day,
  onEdit,
  onDelete,
}: {
  day: WorkoutDay
  onEdit: () => void
  onDelete: () => void
}) {
  const exQ = useWorkoutDayExercises(day.id)
  const createEx = useCreateWorkoutDayExercise()
  const deleteEx = useDeleteWorkoutDayExercise()
  const reorder = useBulkReorderExercises()

  const [expanded, setExpanded] = useState(true)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [exSheet, setExSheet] = useState(false)
  const [editEx, setEditEx] = useState<(WorkoutDayExercise & { exercises: Exercise }) | null>(null)
  const [pendingExercise, setPendingExercise] = useState<Exercise | null>(null)
  const [deleteExTarget, setDeleteExTarget] = useState<WorkoutDayExercise | null>(null)

  const exercises = exQ.data ?? []

  function handlePick(ex: Exercise) {
    setPendingExercise(ex)
    setEditEx(null)
    setExSheet(true)
  }

  function handleEdit(item: WorkoutDayExercise & { exercises: Exercise }) {
    setPendingExercise(item.exercises)
    setEditEx(item)
    setExSheet(true)
  }

  async function handleMove(index: number, dir: 'up' | 'down') {
    const newList = [...exercises]
    const targetIdx = dir === 'up' ? index - 1 : index + 1
    ;[newList[index], newList[targetIdx]] = [newList[targetIdx], newList[index]]
    const orders = newList.map((e, i) => ({ id: e.id, exercise_order: i }))
    await reorder.mutateAsync({ dayId: day.id, orders })
  }

  return (
    <Card className="mb-3">
      {/* Day header */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          className="flex items-center gap-2 flex-1 text-left min-w-0 min-h-[44px]"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-primary">{DAY_NAMES[day.day_index]?.slice(0, 3)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-text truncate">
              {day.title ?? DAY_NAMES[day.day_index] ?? `Day ${day.day_index + 1}`}
            </p>
            {day.day_type && (
              <p className="text-xs text-text-tertiary truncate">{day.day_type}</p>
            )}
          </div>
          <span className="text-xs text-text-tertiary flex-shrink-0">{exercises.length} ex</span>
          {expanded
            ? <ChevronDown className="w-4 h-4 text-text-tertiary flex-shrink-0" />
            : <ChevronRight className="w-4 h-4 text-text-tertiary flex-shrink-0" />
          }
        </button>
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={onEdit} aria-label={`Edit day ${day.title ?? ''}`}
            className="p-2 rounded-lg hover:bg-card-elevated text-text-tertiary hover:text-text transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={onDelete} aria-label={`Delete day ${day.title ?? ''}`}
            className="p-2 rounded-lg hover:bg-card-elevated text-text-tertiary hover:text-error transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3">
          {exQ.isLoading ? (
            <Skeleton className="h-12 rounded" />
          ) : exercises.length === 0 ? (
            <p className="text-xs text-text-tertiary mb-2">No exercises yet.</p>
          ) : (
            <div>
              {exercises.map((ex, i) => (
                <ExerciseRow
                  key={ex.id}
                  item={ex}
                  index={i}
                  total={exercises.length}
                  onEdit={() => handleEdit(ex)}
                  onDelete={() => setDeleteExTarget(ex)}
                  onMove={(dir) => handleMove(i, dir)}
                />
              ))}
            </div>
          )}

          <button
            onClick={() => setPickerOpen(true)}
            className="mt-2 text-xs text-primary hover:text-primary-light font-semibold flex items-center gap-1 min-h-[44px]"
          >
            <Plus className="w-3 h-3" />
            Add Exercise
          </button>
        </div>
      )}

      {/* Exercise picker */}
      <ExercisePickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={handlePick}
      />

      {/* Exercise edit/add sheet */}
      {pendingExercise && (
        <ExerciseSheet
          isOpen={exSheet}
          onClose={() => setExSheet(false)}
          dayId={day.id}
          exerciseId={pendingExercise.id}
          exerciseName={pendingExercise.name}
          existing={editEx}
          nextOrder={exercises.length}
        />
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        isOpen={!!deleteExTarget}
        onClose={() => setDeleteExTarget(null)}
        onConfirm={async () => {
          if (deleteExTarget) {
            await deleteEx.mutateAsync({ id: deleteExTarget.id, dayId: day.id })
            setDeleteExTarget(null)
          }
        }}
        title="Remove Exercise?"
        description="Remove this exercise from the day?"
        isLoading={deleteEx.isPending}
      />
    </Card>
  )
}

// ─── Active plan view ─────────────────────────────────────────────────────────

function ActivePlanView({
  plan,
  onEditPlan,
  onDeletePlan,
}: {
  plan: WorkoutPlan
  onEditPlan: () => void
  onDeletePlan: () => void
}) {
  const daysQ = useWorkoutDays(plan.id)
  const deleteDay = useDeleteWorkoutDay()
  const [daySheet, setDaySheet] = useState(false)
  const [editDay, setEditDay] = useState<WorkoutDay | null>(null)
  const [deleteDay2, setDeleteDay2] = useState<WorkoutDay | null>(null)

  const days = daysQ.data ?? []

  function openAddDay() {
    setEditDay(null)
    setDaySheet(true)
  }
  function openEditDay(d: WorkoutDay) {
    setEditDay(d)
    setDaySheet(true)
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
            {plan.starts_on && (
              <p className="text-xs text-text-tertiary">Starts: {plan.starts_on}</p>
            )}
          </div>
          <div className="flex gap-2 flex-shrink-0">
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
        <p className="text-xs text-text-tertiary">{days.length} day{days.length !== 1 ? 's' : ''} configured</p>
      </Card>

      {/* Days */}
      {daysQ.isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
      ) : daysQ.isError ? (
        <ErrorState message="Could not load workout days." onRetry={() => daysQ.refetch()} />
      ) : days.length === 0 ? (
        <EmptyState
          icon={<Dumbbell className="w-7 h-7 text-text-tertiary" />}
          title="No Days"
          description="Add workout days to this plan."
          action={{ label: 'Add Day', onClick: openAddDay }}
        />
      ) : (
        <div>
          {days.map((d) => (
            <DaySection
              key={d.id}
              day={d}
              onEdit={() => openEditDay(d)}
              onDelete={() => setDeleteDay2(d)}
            />
          ))}
          <Button size="sm" variant="secondary" fullWidth leftIcon={<Plus className="w-4 h-4" />} onClick={openAddDay} className="mt-2">
            Add Day
          </Button>
        </div>
      )}

      <DaySheet
        isOpen={daySheet}
        onClose={() => setDaySheet(false)}
        planId={plan.id}
        existing={editDay}
        nextIndex={days.length}
      />
      <ConfirmDialog
        isOpen={!!deleteDay2}
        onClose={() => setDeleteDay2(null)}
        onConfirm={async () => {
          if (deleteDay2) {
            await deleteDay.mutateAsync({ id: deleteDay2.id, planId: plan.id })
            setDeleteDay2(null)
          }
        }}
        title="Delete Day?"
        description={`Delete "${deleteDay2?.title ?? DAY_NAMES[deleteDay2?.day_index ?? 0]}" and all its exercises?`}
        isLoading={deleteDay.isPending}
      />
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function WorkoutBuilder({ traineeId }: WorkoutBuilderProps) {
  const plansQ = useWorkoutPlans(traineeId)
  const deletePlan = useDeleteWorkoutPlan()

  const [activePlanId, setActivePlanId] = useState<string | null>(null)
  const [planSheet, setPlanSheet] = useState(false)
  const [editPlan, setEditPlan] = useState<WorkoutPlan | null>(null)
  const [deletePlanTarget, setDeletePlanTarget] = useState<WorkoutPlan | null>(null)

  const plans = plansQ.data ?? []

  useEffect(() => {
    if (plans.length > 0 && !activePlanId) setActivePlanId(plans[0].id)
    if (plans.length === 0) setActivePlanId(null)
  }, [plans, activePlanId])

  const activePlan = plans.find((p) => p.id === activePlanId) ?? null

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
    return <ErrorState message="Could not load workout plans." onRetry={() => plansQ.refetch()} className="py-12" />
  }

  return (
    <div className="flex flex-col p-4">
      {/* Plan selector */}
      <div className="mb-4">
        <PlanSelectBar
          plans={plans}
          activePlanId={activePlanId}
          onSelect={setActivePlanId}
          onCreate={() => { setEditPlan(null); setPlanSheet(true) }}
        />
      </div>

      {/* Plan content */}
      {activePlan ? (
        <ActivePlanView
          plan={activePlan}
          onEditPlan={() => { setEditPlan(activePlan); setPlanSheet(true) }}
          onDeletePlan={() => setDeletePlanTarget(activePlan)}
        />
      ) : (
        <EmptyState
          icon={<Dumbbell className="w-7 h-7 text-text-tertiary" />}
          title="No Workout Plans"
          description="Create the first workout plan for this trainee."
          action={{ label: 'Create Plan', onClick: () => setPlanSheet(true) }}
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
        title="Delete Workout Plan?"
        description={`Delete "${deletePlanTarget?.title}" and all its days? This cannot be undone.`}
        isLoading={deletePlan.isPending}
      />
    </div>
  )
}
