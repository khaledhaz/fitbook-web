// Shared TypeScript types derived from the app schema (tables.md)
// All tables live in the `app` Supabase schema.

// ─── Core user tables ─────────────────────────────────────────────────────────

export interface User {
  id: string
  display_name: string | null
  photo_url: string | null
  username: string | null
  preferred_units: 'metric' | 'imperial' | null
  created_at: string
  updated_at: string
}

export interface Trainer {
  id: string
  bio: string | null
  is_verified: boolean
  portfolio_url: string | null
  created_at: string
  updated_at: string
}

export interface Trainee {
  id: string
  trainer_id: string | null
  notes: string | null
  vital_id: string | null
  created_at: string
  updated_at: string
}

export interface Vitals {
  id: string
  user_id: string
  gender: string | null
  date_of_birth: string | null
  height_cm: number | null
  weight_kg: number | null
  goal: string | null
  experience_level: string | null
  waist_cm: number | null
  body_fat_pct: number | null
  target_weight_kg: number | null
  goal_deadline: string | null
  gym_days_per_week: number | null
  priority_muscle_group: string | null
  meals_per_day: number | null
  appetite: string | null
  sleep_hours: number | null
  stress_level: string | null
  allergies: string[] | null
  has_injuries: boolean | null
  injury_details: string | null
  takes_supplements: boolean | null
  created_at: string
  updated_at: string
}

// ─── Workout tables ────────────────────────────────────────────────────────────

export interface WorkoutPlan {
  id: string
  trainee_id: string
  title: string
  description: string | null
  is_template: boolean
  starts_on: string | null
  tags: string[] | null
  source_template_id: string | null
  created_at: string
  updated_at: string
}

export interface WorkoutDay {
  id: string
  workout_plan_id: string
  day_index: number
  day_type: string | null
  title: string | null
  notes: string | null
  tags: string[] | null
  warmup_notes: string | null
  created_at: string
  updated_at: string
}

export interface WorkoutDayExercise {
  id: string
  workout_day_id: string
  exercise_id: string
  custom_name: string | null
  exercise_order: number
  sequence: number | null
  sets: number
  reps_data: Record<string, unknown> | null
  rest_seconds: number | null
  tempo: string | null
  notes: string | null
  is_warmup: boolean
  created_at: string
  updated_at: string
}

export interface WorkoutSession {
  id: string
  trainee_id: string
  workout_plan_id: string | null
  workout_day_id: string | null
  started_at: string
  completed_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface WorkoutSessionSet {
  id: string
  session_id: string
  workout_day_exercise_id: string
  set_index: number
  weight: number | null
  reps: number | null
  rpe: number | null
  is_completed: boolean
  completed_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Exercise {
  id: string
  name: string
  body_part: string[] | null
  equipment: string[] | null
  target: string[] | null
  secondary_muscles: string[] | null
  instructions: string[] | null
  description: string | null
  difficulty: string | null
  category: string | null
  external_id: string | null
  gif_url: string | null
  source: string | null
  musclewiki_id: string | null
  force_type: string | null
  mechanic: string | null
  grips: string[] | null
  video_urls: Record<string, unknown> | null
  primary_muscles: string[] | null
  thumbnail_url: string | null
  created_at: string
  updated_at: string
}

// ─── Meal tables ───────────────────────────────────────────────────────────────

export interface MealPlan {
  id: string
  trainee_id: string
  title: string
  description: string | null
  notes: string | null
  total_calories: number | null
  total_protein: number | null
  total_carbs: number | null
  total_fat: number | null
  source_template_id: string | null
  created_at: string
  updated_at: string
}

export interface Meal {
  id: string
  meal_plan_id: string
  name: string
  meal_type: string
  sort_order: number
  target_time: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface MealVariation {
  id: string
  meal_id: string
  label: string
  sort_order: number
  is_default: boolean
  total_calories: number | null
  total_protein: number | null
  total_carbs: number | null
  total_fat: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface MealVariationItem {
  id: string
  meal_variation_id: string
  name: string
  quantity: number
  unit: string
  calories: number | null
  protein: number | null
  carbs: number | null
  fat: number | null
  fiber: number | null
  sugar: number | null
  sodium: number | null
  sort_order: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface TraineeMealSelection {
  id: string
  trainee_id: string
  meal_id: string
  meal_variation_id: string
  selected_date: string
  created_at: string
  updated_at: string
}

// ─── Supplement tables ─────────────────────────────────────────────────────────

export interface SupplementPlan {
  id: string
  trainee_id: string
  trainer_id: string | null
  title: string
  notes: string | null
  created_at: string
  updated_at: string
}

export interface SupplementItem {
  id: string
  plan_id: string
  category: string | null
  type: string
  brand: string | null
  dosage: string | null
  timing: string | null
  instructions: string | null
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

// ─── Chat tables ───────────────────────────────────────────────────────────────

export interface Conversation {
  id: string
  type: string
  last_message_at: string | null
  last_message_preview: string | null
  created_at: string
  updated_at: string
}

export interface ConversationParticipant {
  id: string
  conversation_id: string
  user_id: string
  joined_at: string
  last_read_at: string | null
  is_muted: boolean
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string | null
  type: string
  media_url: string | null
  media_type: string | null
  media_name: string | null
  media_size: number | null
  thumbnail_url: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

// ─── Connection tables ─────────────────────────────────────────────────────────

export interface ConnectionRequest {
  id: string
  sender_id: string
  receiver_id: string
  type: string
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled'
  message: string | null
  responded_at: string | null
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  recipient_id: string
  sender_id: string | null
  type: string
  title: string
  body: string
  data: Record<string, unknown> | null
  read: boolean
  created_at: string
}

// ─── Body measurements ─────────────────────────────────────────────────────────

export interface BodyMeasurement {
  id: string
  user_id: string
  measured_at: string
  weight_kg: number | null
  body_fat_pct: number | null
  chest_cm: number | null
  waist_cm: number | null
  hips_cm: number | null
  neck_cm: number | null
  bicep_cm: number | null
  thigh_cm: number | null
  calf_cm: number | null
  shoulders_cm: number | null
  forearm_cm: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

// ─── Template tables ───────────────────────────────────────────────────────────

export interface TrainerTemplate {
  id: string
  trainer_id: string
  name: string
  description: string | null
  category: string
  tags: string[] | null
  cover_image_url: string | null
  is_active: boolean
  times_used: number
  created_at: string
  updated_at: string
}

export interface TemplateWorkoutPlan {
  id: string
  template_id: string
  title: string
  description: string | null
  tags: string[] | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface TemplateMealPlan {
  id: string
  template_id: string
  title: string
  description: string | null
  notes: string | null
  total_calories: number | null
  total_protein: number | null
  total_carbs: number | null
  total_fat: number | null
  sort_order: number
  created_at: string
  updated_at: string
}

// ─── Auth / app role ──────────────────────────────────────────────────────────

export type UserRole = 'trainer' | 'trainee' | 'none' | 'loading'

export interface AuthUser {
  id: string
  email: string | null
  email_confirmed_at: string | null
}
