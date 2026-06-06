import React, { useState, useId } from 'react'
import {
  Search,
  Plus,
  FileText,
  Utensils,
  Dumbbell,
  ChevronDown,
  ChevronRight,
  Tag,
  Users,
  X,
} from 'lucide-react'
import { useAuth } from '../../lib/auth'
import {
  useTrainerTemplates,
  useTrainerTemplate,
  useCreateTemplate,
} from '../../lib/api/templates'
import { useTrainerTrainees } from '../../lib/api/users'
import { supabase } from '../../lib/supabase'
import { Card, CardHeader, CardTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input, Textarea } from '../../components/ui/Input'
import { Avatar } from '../../components/ui/Avatar'
import { Skeleton, SkeletonCard } from '../../components/ui/Spinner'
import { EmptyState, ErrorState } from '../../components/ui/States'
import { Modal, Sheet } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/Toast'
import type { TrainerTemplate } from '../../types'
import { cn } from '../../utils/cn'

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = ['all', 'workout', 'meal', 'mixed'] as const
type Category = (typeof CATEGORIES)[number]

// ─── Page ─────────────────────────────────────────────────────────────────────

export function TrainerTemplatesPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const searchId = useId()

  const [selectedCategory, setSelectedCategory] = useState<Category>('all')
  const [search, setSearch] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<TrainerTemplate | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showApplySheet, setShowApplySheet] = useState(false)

  const templatesQ = useTrainerTemplates(user?.id)
  const traineesQ = useTrainerTrainees(user?.id)

  // Filtered templates
  const filtered = (templatesQ.data ?? []).filter((t) => {
    const matchCat = selectedCategory === 'all' || t.category === selectedCategory
    const q = search.toLowerCase()
    const matchSearch = !q || t.name.toLowerCase().includes(q) || (t.description ?? '').toLowerCase().includes(q)
    return matchCat && matchSearch
  })

  const handleApplySuccess = () => {
    setShowApplySheet(false)
    setSelectedTemplate(null)
    toast('Template applied!', 'success')
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text">Templates</h1>
          <p className="text-sm text-text-secondary mt-1">
            Browse, create, and apply workout & meal templates
          </p>
        </div>
        <Button
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setShowCreateModal(true)}
          aria-label="Create new template"
        >
          New template
        </Button>
      </div>

      {/* Search + category filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex-1 relative min-w-0">
          <label htmlFor={searchId} className="sr-only">Search templates</label>
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none"
            aria-hidden="true"
          />
          <input
            id={searchId}
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates…"
            className="w-full h-[52px] bg-input-bg border border-border rounded-md pl-10 pr-4 text-text placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        {/* Category pills */}
        <div className="flex gap-2 flex-wrap" role="group" aria-label="Filter by category">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              aria-pressed={selectedCategory === cat}
              className={cn(
                'px-4 h-[52px] rounded-lg text-sm font-medium border transition-colors capitalize min-w-[44px]',
                selectedCategory === cat
                  ? 'bg-primary text-text-on-primary border-primary'
                  : 'bg-card border-border text-text-secondary hover:text-text hover:border-border-focused'
              )}
            >
              {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {templatesQ.isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : templatesQ.isError ? (
        <ErrorState
          message="Could not load templates."
          onRetry={() => templatesQ.refetch()}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-7 h-7 text-text-tertiary" />}
          title={search || selectedCategory !== 'all' ? 'No matching templates' : 'No templates yet'}
          description={
            search || selectedCategory !== 'all'
              ? 'Try a different search or category.'
              : 'Create your first template to reuse plans across trainees.'
          }
          action={
            !search && selectedCategory === 'all'
              ? { label: 'Create template', onClick: () => setShowCreateModal(true) }
              : undefined
          }
        />
      ) : (
        <ul
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          aria-label="Templates list"
        >
          {filtered.map((tmpl) => (
            <li key={tmpl.id}>
              <TemplateCard
                template={tmpl}
                onApply={() => {
                  setSelectedTemplate(tmpl)
                  setShowApplySheet(true)
                }}
              />
            </li>
          ))}
        </ul>
      )}

      {/* Create modal */}
      <CreateTemplateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        trainerId={user?.id ?? ''}
      />

      {/* Apply sheet */}
      {selectedTemplate && (
        <ApplyTemplateSheet
          isOpen={showApplySheet}
          onClose={() => {
            setShowApplySheet(false)
            setSelectedTemplate(null)
          }}
          template={selectedTemplate}
          trainees={traineesQ.data ?? []}
          onSuccess={handleApplySuccess}
        />
      )}
    </div>
  )
}

// ─── Template Card ─────────────────────────────────────────────────────────────

interface TemplateCardProps {
  template: TrainerTemplate
  onApply: () => void
}

function TemplateCard({ template, onApply }: TemplateCardProps) {
  const [expanded, setExpanded] = useState(false)
  const detailQ = useTrainerTemplate(expanded ? template.id : undefined)

  const CategoryIcon = template.category === 'meal' ? Utensils : Dumbbell

  return (
    <Card elevated className="flex flex-col gap-3 h-full">
      {/* Header row */}
      <div className="flex items-start gap-3 min-w-0">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <CategoryIcon className="w-5 h-5 text-primary" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-text truncate">{template.name}</h3>
          {template.description && (
            <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">{template.description}</p>
          )}
        </div>
      </div>

      {/* Meta */}
      <div className="flex flex-wrap gap-2">
        <CategoryBadge category={template.category} />
        {template.times_used > 0 && (
          <span className="text-xs text-text-tertiary flex items-center gap-1">
            <Users className="w-3 h-3" aria-hidden="true" />
            Used {template.times_used}×
          </span>
        )}
        {template.tags?.map((tag) => (
          <span
            key={tag}
            className="text-xs text-text-tertiary flex items-center gap-1 bg-card rounded-full px-2 py-0.5 border border-border"
          >
            <Tag className="w-2.5 h-2.5" aria-hidden="true" />
            {tag}
          </span>
        ))}
      </div>

      {/* Expand nested structure */}
      <button
        className="flex items-center gap-1 text-xs text-text-secondary hover:text-text transition-colors min-h-[44px] -mx-2 px-2 rounded"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-label={`${expanded ? 'Collapse' : 'Expand'} template details for ${template.name}`}
      >
        {expanded ? (
          <ChevronDown className="w-3 h-3" aria-hidden="true" />
        ) : (
          <ChevronRight className="w-3 h-3" aria-hidden="true" />
        )}
        {expanded ? 'Hide' : 'Show'} structure
      </button>

      {expanded && (
        <div className="border-t border-divider pt-3">
          {detailQ.isLoading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ) : detailQ.data ? (
            <TemplateStructure data={detailQ.data} />
          ) : null}
        </div>
      )}

      {/* Apply CTA */}
      <div className="mt-auto pt-2 border-t border-divider">
        <Button
          variant="outline"
          size="sm"
          fullWidth
          onClick={onApply}
          aria-label={`Apply template ${template.name} to a trainee`}
        >
          Apply to trainee
        </Button>
      </div>
    </Card>
  )
}

// ─── Template structure (nested) ─────────────────────────────────────────────

interface TemplateDetailData {
  template_workout_plans?: Array<{ id: string; title: string; sort_order: number }>
  template_meal_plans?: Array<{ id: string; title: string; sort_order: number; total_calories: number | null }>
}

function TemplateStructure({ data }: { data: TemplateDetailData }) {
  const workoutPlans = data.template_workout_plans ?? []
  const mealPlans = data.template_meal_plans ?? []

  if (!workoutPlans.length && !mealPlans.length) {
    return <p className="text-xs text-text-tertiary">No structure yet.</p>
  }

  return (
    <div className="flex flex-col gap-2">
      {workoutPlans.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-1 flex items-center gap-1">
            <Dumbbell className="w-3 h-3" aria-hidden="true" /> Workout plans
          </p>
          <ul className="flex flex-col gap-1">
            {workoutPlans.map((wp) => (
              <li key={wp.id} className="text-xs text-text-secondary flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-primary flex-shrink-0" aria-hidden="true" />
                {wp.title}
              </li>
            ))}
          </ul>
        </div>
      )}
      {mealPlans.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-1 flex items-center gap-1">
            <Utensils className="w-3 h-3" aria-hidden="true" /> Meal plans
          </p>
          <ul className="flex flex-col gap-1">
            {mealPlans.map((mp) => (
              <li key={mp.id} className="text-xs text-text-secondary flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-primary flex-shrink-0" aria-hidden="true" />
                {mp.title}
                {mp.total_calories != null && (
                  <span className="text-text-tertiary ml-1">{mp.total_calories} kcal</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ─── Category badge ───────────────────────────────────────────────────────────

function CategoryBadge({ category }: { category: string }) {
  const map: Record<string, string> = {
    workout: 'bg-info/10 text-info border-info/30',
    meal: 'bg-success/10 text-success border-success/30',
    mixed: 'bg-primary/10 text-primary border-primary/30',
  }
  const cls = map[category] ?? 'bg-card-elevated text-text-secondary border-border'
  return (
    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full border capitalize', cls)}>
      {category}
    </span>
  )
}

// ─── Create Template Modal ────────────────────────────────────────────────────

interface CreateTemplateModalProps {
  isOpen: boolean
  onClose: () => void
  trainerId: string
}

function CreateTemplateModal({ isOpen, onClose, trainerId }: CreateTemplateModalProps) {
  const { toast } = useToast()
  const createTemplate = useCreateTemplate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<'workout' | 'meal' | 'mixed'>('workout')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    try {
      await createTemplate.mutateAsync({
        trainer_id: trainerId,
        name: name.trim(),
        description: description.trim() || undefined,
        category,
      })
      toast('Template created!', 'success')
      setName('')
      setDescription('')
      setCategory('workout')
      onClose()
    } catch (err) {
      toast((err as Error).message ?? 'Failed to create template', 'error')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Template">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Input
          label="Template name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. 12-Week Muscle Builder"
          required
          autoFocus
        />
        <Textarea
          label="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe this template…"
          rows={3}
        />
        <div>
          <label className="text-sm font-medium text-text-secondary block mb-1" htmlFor="tmpl-cat">
            Category
          </label>
          <select
            id="tmpl-cat"
            value={category}
            onChange={(e) => setCategory(e.target.value as typeof category)}
            className="w-full h-[52px] bg-input-bg border border-border rounded-md px-4 text-text focus:outline-none focus:border-primary"
          >
            <option value="workout">Workout</option>
            <option value="meal">Meal</option>
            <option value="mixed">Mixed</option>
          </select>
        </div>
        <Button type="submit" fullWidth isLoading={createTemplate.isPending}>
          Create template
        </Button>
      </form>
    </Modal>
  )
}

// ─── Apply Template Sheet ─────────────────────────────────────────────────────

interface Trainee {
  id: string
  users: { id: string; display_name: string | null; photo_url: string | null }
}

interface ApplyTemplateSheetProps {
  isOpen: boolean
  onClose: () => void
  template: TrainerTemplate
  trainees: Trainee[]
  onSuccess: () => void
}

function ApplyTemplateSheet({
  isOpen,
  onClose,
  template,
  trainees,
  onSuccess,
}: ApplyTemplateSheetProps) {
  const { toast } = useToast()
  const [selectedTrainee, setSelectedTrainee] = useState<string>('')
  const [applying, setApplying] = useState(false)

  const isMeal = template.category === 'meal'

  const handleApply = async () => {
    if (!selectedTrainee) {
      toast('Select a trainee first.', 'warning')
      return
    }
    setApplying(true)
    try {
      if (isMeal) {
        const { error } = await supabase.rpc('apply_meal_template_to_trainee', {
          p_template_id: template.id,
          p_trainee_id: selectedTrainee,
        })
        if (error) throw error
      } else {
        const { error } = await supabase.rpc('apply_template_to_trainee', {
          p_template_id: template.id,
          p_trainee_id: selectedTrainee,
        })
        if (error) throw error
      }
      onSuccess()
    } catch (e) {
      toast((e as Error).message ?? 'Failed to apply template', 'error')
    } finally {
      setApplying(false)
    }
  }

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title={`Apply "${template.name}"`}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-text-secondary">
          Select a trainee to apply this {template.category} template to.
        </p>

        {trainees.length === 0 ? (
          <EmptyState
            icon={<Users className="w-7 h-7 text-text-tertiary" />}
            title="No trainees yet"
            description="Connect with trainees first."
          />
        ) : (
          <div
            className="flex flex-col gap-2 max-h-60 overflow-y-auto"
            role="radiogroup"
            aria-label="Select trainee"
          >
            {trainees.map((t) => (
              <button
                key={t.id}
                role="radio"
                aria-checked={selectedTrainee === t.id}
                onClick={() => setSelectedTrainee(t.id)}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border transition-colors text-left min-h-[56px]',
                  selectedTrainee === t.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-card-elevated hover:border-border-focused'
                )}
              >
                <Avatar src={t.users?.photo_url} name={t.users?.display_name} size="sm" />
                <span className="text-sm font-medium text-text truncate min-w-0">
                  {t.users?.display_name ?? 'Trainee'}
                </span>
                {selectedTrainee === t.id && (
                  <X
                    className="w-4 h-4 text-primary ml-auto flex-shrink-0"
                    aria-hidden="true"
                  />
                )}
              </button>
            ))}
          </div>
        )}

        <Button
          fullWidth
          onClick={handleApply}
          isLoading={applying}
          disabled={!selectedTrainee || trainees.length === 0}
        >
          Apply template
        </Button>
      </div>
    </Sheet>
  )
}
