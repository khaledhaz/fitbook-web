import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Dumbbell,
  Target,
  Leaf,
  ChevronLeft,
} from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { useUpsertVitals } from '../../lib/api/users'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useToast } from '../../components/ui/Toast'
import { cn } from '../../utils/cn'

// ─── Steps ───────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 'basic',     label: 'Basic Info',   icon: Dumbbell },
  { id: 'goals',     label: 'Goals',        icon: Target },
  { id: 'lifestyle', label: 'Lifestyle',    icon: Leaf },
] as const

type StepId = (typeof STEPS)[number]['id']

// ─── Form shape ───────────────────────────────────────────────────────────────

interface VitalsForm {
  gender: string
  date_of_birth: string
  height_cm: string
  weight_kg: string
  target_weight_kg: string
  goal: string
  experience_level: string
  gym_days_per_week: string
  priority_muscle_group: string
  meals_per_day: string
  sleep_hours: string
  stress_level: string
  appetite: string
  has_injuries: boolean
  injury_details: string
  takes_supplements: boolean
  allergies: string
}

const initialForm: VitalsForm = {
  gender: '',
  date_of_birth: '',
  height_cm: '',
  weight_kg: '',
  target_weight_kg: '',
  goal: '',
  experience_level: '',
  gym_days_per_week: '',
  priority_muscle_group: '',
  meals_per_day: '',
  sleep_hours: '',
  stress_level: '',
  appetite: '',
  has_injuries: false,
  injury_details: '',
  takes_supplements: false,
  allergies: '',
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function VitalsOnboardingPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const upsertVitals = useUpsertVitals()

  const [stepIndex, setStepIndex] = useState(0)
  const [form, setForm] = useState<VitalsForm>(initialForm)

  const currentStep = STEPS[stepIndex]
  const isFirst = stepIndex === 0
  const isLast = stepIndex === STEPS.length - 1

  const update = (field: keyof VitalsForm, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }))

  const handleBack = () => {
    if (isFirst) return
    setStepIndex((i) => i - 1)
  }

  const handleNext = () => {
    if (isLast) {
      void handleFinish()
    } else {
      setStepIndex((i) => i + 1)
    }
  }

  const handleFinish = async () => {
    if (!user) return

    // Parse allergies into array
    const allergiesArr = form.allergies
      ? form.allergies.split(',').map((s) => s.trim()).filter(Boolean)
      : null

    try {
      await upsertVitals.mutateAsync({
        user_id: user.id,
        gender: form.gender || null,
        date_of_birth: form.date_of_birth || null,
        height_cm: form.height_cm ? Number(form.height_cm) : null,
        weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
        target_weight_kg: form.target_weight_kg ? Number(form.target_weight_kg) : null,
        goal: form.goal || null,
        experience_level: form.experience_level || null,
        gym_days_per_week: form.gym_days_per_week ? Number(form.gym_days_per_week) : null,
        priority_muscle_group: form.priority_muscle_group || null,
        meals_per_day: form.meals_per_day ? Number(form.meals_per_day) : null,
        sleep_hours: form.sleep_hours ? Number(form.sleep_hours) : null,
        stress_level: form.stress_level || null,
        appetite: form.appetite || null,
        has_injuries: form.has_injuries,
        injury_details: form.has_injuries && form.injury_details ? form.injury_details : null,
        takes_supplements: form.takes_supplements,
        allergies: allergiesArr,
      })
      toast('Profile set up!', 'success')
      navigate('/home', { replace: true })
    } catch (e) {
      toast((e as Error).message ?? 'Failed to save vitals. Try again.', 'error')
    }
  }

  const progress = ((stepIndex + 1) / STEPS.length) * 100

  return (
    <div className="min-h-dvh bg-bg flex flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        {!isFirst && (
          <button
            onClick={handleBack}
            className="p-2 rounded-lg hover:bg-card text-text-secondary hover:text-text transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Previous step"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        <div className="flex items-center gap-2">
          <Dumbbell className="w-5 h-5 text-primary" aria-hidden="true" />
          <span className="text-base font-bold text-text">FitBook</span>
        </div>
      </div>

      {/* Progress */}
      <div className="px-4" aria-label={`Step ${stepIndex + 1} of ${STEPS.length}`} role="status">
        <div className="w-full h-1.5 bg-card-elevated rounded-full" aria-hidden="true">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          {STEPS.map((s, i) => (
            <span
              key={s.id}
              className={cn(
                'text-xs font-medium transition-colors',
                i === stepIndex ? 'text-primary' : i < stepIndex ? 'text-success' : 'text-text-tertiary'
              )}
            >
              {s.label}
            </span>
          ))}
        </div>
      </div>

      {/* Form body */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-sm mx-auto w-full">
          {/* Step heading */}
          <div className="flex items-center gap-2 mb-6">
            {React.createElement(currentStep.icon, {
              className: 'w-5 h-5 text-primary',
              'aria-hidden': true,
            })}
            <h1 className="text-xl font-bold text-text">{currentStep.label}</h1>
          </div>

          {/* Step 0: Basic Info */}
          {currentStep.id === 'basic' && (
            <fieldset className="flex flex-col gap-4 border-none p-0 m-0">
              <legend className="sr-only">Basic information</legend>

              <div>
                <label className="text-sm font-medium text-text-secondary block mb-1" htmlFor="gender">
                  Gender
                </label>
                <select
                  id="gender"
                  value={form.gender}
                  onChange={(e) => update('gender', e.target.value)}
                  className="w-full h-[52px] bg-input-bg border border-border rounded-md px-4 text-text focus:outline-none focus:border-primary"
                >
                  <option value="">Select…</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </div>

              <Input
                label="Date of birth"
                type="date"
                value={form.date_of_birth}
                onChange={(e) => update('date_of_birth', e.target.value)}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Height (cm)"
                  type="number"
                  inputMode="numeric"
                  value={form.height_cm}
                  onChange={(e) => update('height_cm', e.target.value)}
                  placeholder="175"
                  min={50}
                  max={280}
                />
                <Input
                  label="Weight (kg)"
                  type="number"
                  inputMode="decimal"
                  value={form.weight_kg}
                  onChange={(e) => update('weight_kg', e.target.value)}
                  placeholder="70"
                  min={20}
                  max={500}
                />
              </div>

              <Input
                label="Target weight (kg)"
                type="number"
                inputMode="decimal"
                value={form.target_weight_kg}
                onChange={(e) => update('target_weight_kg', e.target.value)}
                placeholder="65"
                min={20}
                max={500}
              />
            </fieldset>
          )}

          {/* Step 1: Goals */}
          {currentStep.id === 'goals' && (
            <fieldset className="flex flex-col gap-4 border-none p-0 m-0">
              <legend className="sr-only">Fitness goals</legend>

              <div>
                <label className="text-sm font-medium text-text-secondary block mb-1" htmlFor="goal">
                  Primary goal
                </label>
                <select
                  id="goal"
                  value={form.goal}
                  onChange={(e) => update('goal', e.target.value)}
                  className="w-full h-[52px] bg-input-bg border border-border rounded-md px-4 text-text focus:outline-none focus:border-primary"
                >
                  <option value="">Select…</option>
                  <option value="weight_loss">Weight Loss</option>
                  <option value="muscle_building">Muscle Building</option>
                  <option value="strength">Strength</option>
                  <option value="endurance">Endurance</option>
                  <option value="general_fitness">General Fitness</option>
                  <option value="body_recomposition">Body Recomposition</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-text-secondary block mb-1" htmlFor="experience">
                  Experience level
                </label>
                <select
                  id="experience"
                  value={form.experience_level}
                  onChange={(e) => update('experience_level', e.target.value)}
                  className="w-full h-[52px] bg-input-bg border border-border rounded-md px-4 text-text focus:outline-none focus:border-primary"
                >
                  <option value="">Select…</option>
                  <option value="beginner">Beginner (0–1 years)</option>
                  <option value="intermediate">Intermediate (1–3 years)</option>
                  <option value="advanced">Advanced (3+ years)</option>
                </select>
              </div>

              <Input
                label="Gym days per week"
                type="number"
                inputMode="numeric"
                value={form.gym_days_per_week}
                onChange={(e) => update('gym_days_per_week', e.target.value)}
                placeholder="4"
                min={1}
                max={7}
              />

              <div>
                <label className="text-sm font-medium text-text-secondary block mb-1" htmlFor="muscle-group">
                  Priority muscle group
                </label>
                <select
                  id="muscle-group"
                  value={form.priority_muscle_group}
                  onChange={(e) => update('priority_muscle_group', e.target.value)}
                  className="w-full h-[52px] bg-input-bg border border-border rounded-md px-4 text-text focus:outline-none focus:border-primary"
                >
                  <option value="">Select…</option>
                  <option value="chest">Chest</option>
                  <option value="back">Back</option>
                  <option value="legs">Legs</option>
                  <option value="shoulders">Shoulders</option>
                  <option value="arms">Arms</option>
                  <option value="core">Core</option>
                  <option value="glutes">Glutes</option>
                  <option value="full_body">Full Body</option>
                </select>
              </div>
            </fieldset>
          )}

          {/* Step 2: Lifestyle */}
          {currentStep.id === 'lifestyle' && (
            <fieldset className="flex flex-col gap-4 border-none p-0 m-0">
              <legend className="sr-only">Lifestyle information</legend>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Meals per day"
                  type="number"
                  inputMode="numeric"
                  value={form.meals_per_day}
                  onChange={(e) => update('meals_per_day', e.target.value)}
                  placeholder="3"
                  min={1}
                  max={10}
                />
                <Input
                  label="Sleep hours"
                  type="number"
                  inputMode="decimal"
                  value={form.sleep_hours}
                  onChange={(e) => update('sleep_hours', e.target.value)}
                  placeholder="8"
                  min={3}
                  max={14}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-text-secondary block mb-1" htmlFor="stress">
                  Stress level
                </label>
                <select
                  id="stress"
                  value={form.stress_level}
                  onChange={(e) => update('stress_level', e.target.value)}
                  className="w-full h-[52px] bg-input-bg border border-border rounded-md px-4 text-text focus:outline-none focus:border-primary"
                >
                  <option value="">Select…</option>
                  <option value="low">Low</option>
                  <option value="moderate">Moderate</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-text-secondary block mb-1" htmlFor="appetite">
                  Appetite
                </label>
                <select
                  id="appetite"
                  value={form.appetite}
                  onChange={(e) => update('appetite', e.target.value)}
                  className="w-full h-[52px] bg-input-bg border border-border rounded-md px-4 text-text focus:outline-none focus:border-primary"
                >
                  <option value="">Select…</option>
                  <option value="small">Small</option>
                  <option value="moderate">Moderate</option>
                  <option value="large">Large</option>
                </select>
              </div>

              {/* Injuries toggle */}
              <div className="flex items-center justify-between p-4 bg-card-elevated border border-border rounded-lg gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text">Any injuries?</p>
                  <p className="text-xs text-text-tertiary">So your trainer can adapt your program</p>
                </div>
                <button
                  role="switch"
                  aria-checked={form.has_injuries}
                  onClick={() => update('has_injuries', !form.has_injuries)}
                  className={cn(
                    'relative w-12 h-6 rounded-full transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                    form.has_injuries ? 'bg-primary' : 'bg-border'
                  )}
                  aria-label="Toggle injury flag"
                >
                  <span
                    className={cn(
                      'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                      form.has_injuries ? 'translate-x-7' : 'translate-x-1'
                    )}
                    aria-hidden="true"
                  />
                </button>
              </div>

              {form.has_injuries && (
                <div>
                  <label className="text-sm font-medium text-text-secondary block mb-1" htmlFor="injury-details">
                    Injury details
                  </label>
                  <textarea
                    id="injury-details"
                    value={form.injury_details}
                    onChange={(e) => update('injury_details', e.target.value)}
                    placeholder="Describe your injuries briefly…"
                    rows={3}
                    className="w-full bg-input-bg border border-border rounded-md p-3 text-text placeholder:text-text-muted resize-none focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              )}

              {/* Supplements toggle */}
              <div className="flex items-center justify-between p-4 bg-card-elevated border border-border rounded-lg gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text">Takes supplements?</p>
                  <p className="text-xs text-text-tertiary">Protein, creatine, vitamins, etc.</p>
                </div>
                <button
                  role="switch"
                  aria-checked={form.takes_supplements}
                  onClick={() => update('takes_supplements', !form.takes_supplements)}
                  className={cn(
                    'relative w-12 h-6 rounded-full transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                    form.takes_supplements ? 'bg-primary' : 'bg-border'
                  )}
                  aria-label="Toggle supplements flag"
                >
                  <span
                    className={cn(
                      'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                      form.takes_supplements ? 'translate-x-7' : 'translate-x-1'
                    )}
                    aria-hidden="true"
                  />
                </button>
              </div>

              <Input
                label="Allergies or dietary restrictions"
                type="text"
                value={form.allergies}
                onChange={(e) => update('allergies', e.target.value)}
                placeholder="Lactose, gluten, nuts… (comma-separated)"
                hint="Leave blank if none"
              />
            </fieldset>
          )}
        </div>
      </div>

      {/* Sticky bottom nav */}
      <div className="px-4 py-4 border-t border-divider flex-shrink-0">
        <div className="max-w-sm mx-auto">
          <Button
            fullWidth
            onClick={handleNext}
            isLoading={isLast && upsertVitals.isPending}
          >
            {isLast ? 'Finish setup' : 'Continue'}
          </Button>
          {isFirst && (
            <p className="text-xs text-text-tertiary text-center mt-3">
              You can update this anytime from your profile.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
