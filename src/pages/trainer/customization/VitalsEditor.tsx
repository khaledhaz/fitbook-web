import React, { useEffect, useState } from 'react'
import { useVitals, useUpsertVitals } from '../../../lib/api/users'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Input, Textarea } from '../../../components/ui/Input'
import { Skeleton } from '../../../components/ui/Spinner'
import { EmptyState, ErrorState } from '../../../components/ui/States'
import { SectionTitle } from './_shared/SectionTitle'
import { Sheet } from '../../../components/ui/Modal'
import { Pencil, Heart } from 'lucide-react'
import type { Vitals } from '../../../types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface VitalsEditorProps {
  traineeId: string
}

// ─── Helper ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return iso
  }
}

function calcAge(dob: string | null | undefined): string {
  if (!dob) return '—'
  try {
    const birth = new Date(dob)
    const now = new Date()
    let age = now.getFullYear() - birth.getFullYear()
    if (
      now.getMonth() < birth.getMonth() ||
      (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
    ) {
      age--
    }
    return `${age} years`
  } catch {
    return '—'
  }
}

function calcBmi(height: number | null, weight: number | null): { value: number; category: string } | null {
  if (!height || !weight || height <= 0) return null
  const bmi = weight / ((height / 100) * (height / 100))
  let category = 'Unknown'
  if (bmi < 18.5) category = 'Underweight'
  else if (bmi < 25) category = 'Normal'
  else if (bmi < 30) category = 'Overweight'
  else category = 'Obese'
  return { value: bmi, category }
}

function bmiColor(category: string): string {
  switch (category) {
    case 'Underweight': return '#007AFF'
    case 'Normal': return '#34C759'
    case 'Overweight': return '#FF9500'
    case 'Obese': return '#FF3B30'
    default: return '#8B93A8'
  }
}

function cap(s: string | null | undefined): string {
  if (!s) return '—'
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ')
}

// ─── Edit form state ──────────────────────────────────────────────────────────

type VitalsFormState = {
  gender: string
  date_of_birth: string
  height_cm: string
  weight_kg: string
  goal: string
  experience_level: string
  waist_cm: string
  body_fat_pct: string
  target_weight_kg: string
  goal_deadline: string
  gym_days_per_week: string
  priority_muscle_group: string
  meals_per_day: string
  appetite: string
  sleep_hours: string
  stress_level: string
  allergies: string
  has_injuries: boolean
  injury_details: string
  takes_supplements: boolean
}

function vitalsToForm(v: Vitals): VitalsFormState {
  return {
    gender: v.gender ?? '',
    date_of_birth: v.date_of_birth ?? '',
    height_cm: v.height_cm != null ? String(v.height_cm) : '',
    weight_kg: v.weight_kg != null ? String(v.weight_kg) : '',
    goal: v.goal ?? '',
    experience_level: v.experience_level ?? '',
    waist_cm: v.waist_cm != null ? String(v.waist_cm) : '',
    body_fat_pct: v.body_fat_pct != null ? String(v.body_fat_pct) : '',
    target_weight_kg: v.target_weight_kg != null ? String(v.target_weight_kg) : '',
    goal_deadline: v.goal_deadline ?? '',
    gym_days_per_week: v.gym_days_per_week != null ? String(v.gym_days_per_week) : '',
    priority_muscle_group: v.priority_muscle_group ?? '',
    meals_per_day: v.meals_per_day != null ? String(v.meals_per_day) : '',
    appetite: v.appetite ?? '',
    sleep_hours: v.sleep_hours != null ? String(v.sleep_hours) : '',
    stress_level: v.stress_level ?? '',
    allergies: v.allergies?.join(', ') ?? '',
    has_injuries: v.has_injuries ?? false,
    injury_details: v.injury_details ?? '',
    takes_supplements: v.takes_supplements ?? false,
  }
}

// ─── Metric card ──────────────────────────────────────────────────────────────

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 min-w-0 bg-card-elevated border border-border rounded-lg p-3 text-center">
      <p className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-1">{label}</p>
      <p className="text-lg font-bold text-text truncate">{value}</p>
    </div>
  )
}

// ─── Key value row ────────────────────────────────────────────────────────────

function KVRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-divider last:border-0 min-w-0">
      <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider flex-shrink-0">
        {label}
      </span>
      <span className="text-sm font-semibold text-primary text-right min-w-0 truncate">{value}</span>
    </div>
  )
}

// ─── BMI Spectrum Bar ─────────────────────────────────────────────────────────

function BmiSpectrumBar({ bmi }: { bmi: number }) {
  const pct = (((bmi - 15) / 25) * 100).toFixed(1)
  const clamped = Math.min(Math.max(parseFloat(pct), 0), 100)

  return (
    <div className="mt-3">
      <div className="relative h-2 rounded-full overflow-hidden" aria-hidden="true">
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'linear-gradient(to right, #007AFF 0%, #34C759 35%, #FF9500 60%, #FF3B30 100%)',
          }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-text border-2 border-bg shadow"
          style={{ left: `${clamped}%`, transform: 'translate(-50%, -50%)' }}
        />
      </div>
      <div className="flex justify-between text-xs text-text-tertiary mt-1 px-0.5">
        <span>15</span>
        <span>18.5</span>
        <span>25</span>
        <span>30</span>
        <span>40</span>
      </div>
    </div>
  )
}

// ─── Edit Sheet ───────────────────────────────────────────────────────────────

function VitalsEditSheet({
  isOpen,
  onClose,
  initial,
  traineeId,
}: {
  isOpen: boolean
  onClose: () => void
  initial: VitalsFormState
  traineeId: string
}) {
  const [form, setForm] = useState<VitalsFormState>(initial)
  const [error, setError] = useState<string | null>(null)
  const upsert = useUpsertVitals()

  useEffect(() => {
    if (isOpen) {
      setForm(initial)
      setError(null)
    }
  }, [isOpen, initial])

  function set(field: keyof VitalsFormState, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    setError(null)
    const payload: Partial<Vitals> & { user_id: string } = {
      user_id: traineeId,
      gender: form.gender || null,
      date_of_birth: form.date_of_birth || null,
      height_cm: form.height_cm ? parseFloat(form.height_cm) : null,
      weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
      goal: form.goal || null,
      experience_level: form.experience_level || null,
      waist_cm: form.waist_cm ? parseFloat(form.waist_cm) : null,
      body_fat_pct: form.body_fat_pct ? parseFloat(form.body_fat_pct) : null,
      target_weight_kg: form.target_weight_kg ? parseFloat(form.target_weight_kg) : null,
      goal_deadline: form.goal_deadline || null,
      gym_days_per_week: form.gym_days_per_week ? parseInt(form.gym_days_per_week) : null,
      priority_muscle_group: form.priority_muscle_group || null,
      meals_per_day: form.meals_per_day ? parseInt(form.meals_per_day) : null,
      appetite: form.appetite || null,
      sleep_hours: form.sleep_hours ? parseFloat(form.sleep_hours) : null,
      stress_level: form.stress_level || null,
      allergies: form.allergies ? form.allergies.split(',').map((s) => s.trim()).filter(Boolean) : null,
      has_injuries: form.has_injuries,
      injury_details: form.injury_details || null,
      takes_supplements: form.takes_supplements,
    }

    try {
      await upsert.mutateAsync(payload)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save vitals')
    }
  }

  const fieldClass = 'mb-3'

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title="Edit Vitals">
      <div className="flex flex-col gap-0">
        <div className={fieldClass}>
          <label className="text-sm font-medium text-text-secondary block mb-1">Gender</label>
          <select
            value={form.gender}
            onChange={(e) => set('gender', e.target.value)}
            className="w-full h-[52px] bg-input-bg border border-border rounded-md px-4 text-text focus:outline-none focus:border-primary transition-colors"
          >
            <option value="">Select…</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className={fieldClass}>
          <Input
            label="Date of Birth"
            type="date"
            value={form.date_of_birth}
            onChange={(e) => set('date_of_birth', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <Input
            label="Height (cm)"
            type="number"
            min="50"
            max="300"
            value={form.height_cm}
            onChange={(e) => set('height_cm', e.target.value)}
          />
          <Input
            label="Weight (kg)"
            type="number"
            min="20"
            max="500"
            value={form.weight_kg}
            onChange={(e) => set('weight_kg', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <Input
            label="Waist (cm)"
            type="number"
            value={form.waist_cm}
            onChange={(e) => set('waist_cm', e.target.value)}
          />
          <Input
            label="Body Fat %"
            type="number"
            value={form.body_fat_pct}
            onChange={(e) => set('body_fat_pct', e.target.value)}
          />
        </div>

        <div className={fieldClass}>
          <label className="text-sm font-medium text-text-secondary block mb-1">Goal</label>
          <select
            value={form.goal}
            onChange={(e) => set('goal', e.target.value)}
            className="w-full h-[52px] bg-input-bg border border-border rounded-md px-4 text-text focus:outline-none focus:border-primary transition-colors"
          >
            <option value="">Select…</option>
            <option value="lose_weight">Lose Weight</option>
            <option value="gain_muscle">Gain Muscle</option>
            <option value="maintain">Maintain</option>
            <option value="improve_fitness">Improve Fitness</option>
          </select>
        </div>

        <div className={fieldClass}>
          <label className="text-sm font-medium text-text-secondary block mb-1">Experience Level</label>
          <select
            value={form.experience_level}
            onChange={(e) => set('experience_level', e.target.value)}
            className="w-full h-[52px] bg-input-bg border border-border rounded-md px-4 text-text focus:outline-none focus:border-primary transition-colors"
          >
            <option value="">Select…</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <Input
            label="Target Weight (kg)"
            type="number"
            value={form.target_weight_kg}
            onChange={(e) => set('target_weight_kg', e.target.value)}
          />
          <Input
            label="Gym Days/Week"
            type="number"
            min="0"
            max="7"
            value={form.gym_days_per_week}
            onChange={(e) => set('gym_days_per_week', e.target.value)}
          />
        </div>

        <div className={fieldClass}>
          <Input
            label="Goal Deadline"
            type="date"
            value={form.goal_deadline}
            onChange={(e) => set('goal_deadline', e.target.value)}
          />
        </div>

        <div className={fieldClass}>
          <Input
            label="Priority Muscle Group"
            value={form.priority_muscle_group}
            onChange={(e) => set('priority_muscle_group', e.target.value)}
            placeholder="e.g. chest, legs"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <Input
            label="Meals/Day"
            type="number"
            min="1"
            max="10"
            value={form.meals_per_day}
            onChange={(e) => set('meals_per_day', e.target.value)}
          />
          <Input
            label="Sleep (hrs)"
            type="number"
            min="0"
            max="24"
            step="0.5"
            value={form.sleep_hours}
            onChange={(e) => set('sleep_hours', e.target.value)}
          />
        </div>

        <div className={fieldClass}>
          <label className="text-sm font-medium text-text-secondary block mb-1">Appetite</label>
          <select
            value={form.appetite}
            onChange={(e) => set('appetite', e.target.value)}
            className="w-full h-[52px] bg-input-bg border border-border rounded-md px-4 text-text focus:outline-none focus:border-primary transition-colors"
          >
            <option value="">Select…</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <div className={fieldClass}>
          <label className="text-sm font-medium text-text-secondary block mb-1">Stress Level</label>
          <select
            value={form.stress_level}
            onChange={(e) => set('stress_level', e.target.value)}
            className="w-full h-[52px] bg-input-bg border border-border rounded-md px-4 text-text focus:outline-none focus:border-primary transition-colors"
          >
            <option value="">Select…</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <div className={fieldClass}>
          <Input
            label="Allergies (comma separated)"
            value={form.allergies}
            onChange={(e) => set('allergies', e.target.value)}
            placeholder="nuts, dairy, gluten…"
          />
        </div>

        <div className="flex items-center gap-3 mb-3 py-2">
          <input
            id="vitals-injuries"
            type="checkbox"
            checked={form.has_injuries}
            onChange={(e) => set('has_injuries', e.target.checked)}
            className="w-5 h-5 accent-primary"
          />
          <label htmlFor="vitals-injuries" className="text-sm text-text-secondary cursor-pointer">
            Has Injuries
          </label>
        </div>

        {form.has_injuries && (
          <div className={fieldClass}>
            <Textarea
              label="Injury Details"
              value={form.injury_details}
              onChange={(e) => set('injury_details', e.target.value)}
              rows={2}
            />
          </div>
        )}

        <div className="flex items-center gap-3 mb-4 py-2">
          <input
            id="vitals-supplements"
            type="checkbox"
            checked={form.takes_supplements}
            onChange={(e) => set('takes_supplements', e.target.checked)}
            className="w-5 h-5 accent-primary"
          />
          <label htmlFor="vitals-supplements" className="text-sm text-text-secondary cursor-pointer">
            Takes Supplements
          </label>
        </div>

        {error && (
          <p className="text-error text-sm mb-4" role="alert">{error}</p>
        )}

        <Button fullWidth onClick={handleSave} isLoading={upsert.isPending}>
          Save Vitals
        </Button>
      </div>
    </Sheet>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function VitalsEditor({ traineeId }: VitalsEditorProps) {
  const vitalsQ = useVitals(traineeId)
  const [editOpen, setEditOpen] = useState(false)

  if (vitalsQ.isLoading) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <div className="flex gap-3">
          <Skeleton className="flex-1 h-20 rounded-lg" />
          <Skeleton className="flex-1 h-20 rounded-lg" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="flex-1 h-20 rounded-lg" />
          <Skeleton className="flex-1 h-20 rounded-lg" />
        </div>
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
      </div>
    )
  }

  if (vitalsQ.isError) {
    return (
      <ErrorState
        message="Could not load vitals data."
        onRetry={() => vitalsQ.refetch()}
        className="py-12"
      />
    )
  }

  const vitals = vitalsQ.data

  if (!vitals) {
    return (
      <div className="flex flex-col items-center py-12">
        <EmptyState
          icon={<Heart className="w-7 h-7 text-text-tertiary" />}
          title="No Vitals Data"
          description="This trainee hasn't completed vitals onboarding yet."
        />
      </div>
    )
  }

  const bmi = calcBmi(vitals.height_cm, vitals.weight_kg)
  const formInitial = vitalsToForm(vitals)

  return (
    <div className="flex flex-col gap-5 p-4">
      {/* Edit button */}
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="outline"
          leftIcon={<Pencil className="w-4 h-4" />}
          onClick={() => setEditOpen(true)}
        >
          Edit
        </Button>
      </div>

      {/* Physical data */}
      <section>
        <SectionTitle>Physical Data</SectionTitle>
        <div className="flex gap-3 mb-3">
          <MetricCard
            label="Height"
            value={vitals.height_cm != null ? `${vitals.height_cm} cm` : '—'}
          />
          <MetricCard
            label="Weight"
            value={vitals.weight_kg != null ? `${vitals.weight_kg} kg` : '—'}
          />
        </div>
        <div className="flex gap-3 mb-3">
          <MetricCard label="Age" value={calcAge(vitals.date_of_birth)} />
          <MetricCard label="Gender" value={cap(vitals.gender)} />
        </div>
        <div className="flex gap-3">
          <MetricCard
            label="Waist"
            value={vitals.waist_cm != null ? `${vitals.waist_cm} cm` : '—'}
          />
          <MetricCard
            label="Body Fat"
            value={vitals.body_fat_pct != null ? `${vitals.body_fat_pct.toFixed(1)}%` : '—'}
          />
        </div>
      </section>

      {/* BMI */}
      {bmi && (
        <section>
          <SectionTitle>Body Mass Index</SectionTitle>
          <Card elevated>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-text">{bmi.value.toFixed(1)}</span>
              <span
                className="text-xs font-semibold px-3 py-1 rounded-full border"
                style={{
                  color: bmiColor(bmi.category),
                  backgroundColor: `${bmiColor(bmi.category)}22`,
                  borderColor: `${bmiColor(bmi.category)}44`,
                }}
              >
                {bmi.category}
              </span>
            </div>
            <BmiSpectrumBar bmi={bmi.value} />
          </Card>
        </section>
      )}

      {/* Goals & Training */}
      <section>
        <SectionTitle>Goals & Training</SectionTitle>
        <Card>
          <KVRow label="Goal" value={cap(vitals.goal)} />
          <KVRow label="Experience" value={cap(vitals.experience_level)} />
          <KVRow
            label="Target Weight"
            value={vitals.target_weight_kg != null ? `${vitals.target_weight_kg} kg` : '—'}
          />
          <KVRow label="Deadline" value={formatDate(vitals.goal_deadline)} />
          <KVRow
            label="Gym Days/Wk"
            value={vitals.gym_days_per_week != null ? `${vitals.gym_days_per_week} days` : '—'}
          />
          <KVRow label="Priority Muscle" value={cap(vitals.priority_muscle_group)} />
          <KVRow
            label="Injuries"
            value={
              vitals.has_injuries
                ? vitals.injury_details
                  ? `Yes — ${vitals.injury_details}`
                  : 'Yes'
                : 'None'
            }
          />
        </Card>
      </section>

      {/* Nutrition & Lifestyle */}
      <section>
        <SectionTitle>Nutrition & Lifestyle</SectionTitle>
        <Card>
          <KVRow
            label="Meals/Day"
            value={vitals.meals_per_day != null ? String(vitals.meals_per_day) : '—'}
          />
          <KVRow label="Appetite" value={cap(vitals.appetite)} />
          <KVRow
            label="Sleep"
            value={vitals.sleep_hours != null ? `${vitals.sleep_hours} hrs` : '—'}
          />
          <KVRow label="Stress" value={cap(vitals.stress_level)} />
          <KVRow
            label="Allergies"
            value={
              vitals.allergies && vitals.allergies.length > 0
                ? vitals.allergies.join(', ')
                : 'None'
            }
          />
          <KVRow label="Supplements" value={vitals.takes_supplements ? 'Yes' : 'No'} />
        </Card>
      </section>

      <VitalsEditSheet
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        initial={formInitial}
        traineeId={traineeId}
      />
    </div>
  )
}
