# FitBook Web — Build Spec (source of truth)

A **website version** of the FitBook fitness-coaching app. This is a NEW, standalone project.

## ⛔ Hard constraints (never violate)
- **NEVER modify the FitBook project** at `/Users/khaled/LocalProjects/FitBook` — not its DB, backend, Flutter app, or any file. Treat it as READ-ONLY reference.
- We **use** the SAME Supabase project as a client (exactly as the Flutter app does for auth/chat). We do NOT change schema, RLS, functions, or the Railway backend / its env.
- Do not run any Supabase migration / DDL / `execute_sql` writes against the FitBook project. No service-role key in the web app — public anon key only.

## Architecture decision (verified by probing, 2026-06-07)
The Express backend on Railway (`https://fitbook-production.up.railway.app/api`) CORS-allows only `localhost:3000/8080` + one `FRONTEND_URL` env we cannot set. So a browser on a public domain is **CORS-blocked** from that API. We therefore build a **Supabase-direct client**:

- **Auth**: Supabase Auth (email/password), PKCE, `persistSession`, `autoRefreshToken`.
- **Data**: Supabase PostgREST on schema **`app`** (`db: { schema: 'app' }`) — direct table CRUD governed by RLS (VERIFIED: authenticated reads succeed on all key tables).
- **Business logic**: call Postgres RPCs directly via `supabase.rpc()` (VERIFIED: `get_supplement_plan` returns data to an authenticated client). RPC names below — **read the matching backend controller for exact param names** (some use `p_*` params; PostgREST 404 = wrong param name/schema, fix by matching the controller).
- **Storage**: Supabase Storage buckets `user_avatars`, `chat_media`.
- **Realtime**: Supabase Realtime for chat.
- A few backend endpoints are pure Express logic over service-role (e.g. connection-accept side effects). Replicate the equivalent client-side via table ops/RPC where RLS permits; if RLS blocks a step, degrade gracefully and document it — do NOT try to change the backend.

This deploys as a **static SPA** (no server), publishable autonomously.

## Supabase client config
```
URL:       https://vaywkjksblafjgduecip.supabase.co
ANON KEY:  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZheXdramtzYmxhZmpnZHVlY2lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMjQxNTAsImV4cCI6MjA3MTkwMDE1MH0.Hta6vxkopZwI0QnzYEeIatoFg11J4M8qIg8WD1KZ42w
SCHEMA:    app   (set in createClient: { db: { schema: 'app' } })
```
Public anon key is RLS-protected and safe to ship in client JS (same as the Flutter app).

## Stack
- React 18 + TypeScript (strict) + Vite. React Router v6. TanStack Query for data. Tailwind CSS.
- `@supabase/supabase-js` v2. Charts: recharts. Icons: lucide-react.
- Build to static `dist/`. Base path must work both at a domain root AND at `/fitbook-web/` on GitHub Pages (use Vite `base` + a router basename, or HashRouter to be safe on Pages).

## Authoritative FitBook references (READ, do not edit)
- Schema (all columns): `/Users/khaled/LocalProjects/FitBook/backend/sql/schema/tables.md`
- Routes/guards: `/Users/khaled/LocalProjects/FitBook/fitbook/fitbookv2/lib/core/routing/app_router.dart` + `route_guards.dart`
- Design tokens: `/Users/khaled/LocalProjects/FitBook/fitbook/fitbookv2/lib/utils/brand.dart`
- API contracts / request shapes: `/Users/khaled/LocalProjects/FitBook/backend/ROUTE_INVENTORY.md`, `backend/schemas/*` (Zod), `backend/controllers/*` (for exact RPC names/params + behaviors)
- Screens to mirror: `fitbook/fitbookv2/lib/views/*`

## RPCs (call directly; confirm param names in the controller of the same domain)
apply_meal_template_to_trainee, apply_template_to_trainee, assign_trainer_to_trainee, bulk_reorder_exercises, delete_supplement_item, get_supplement_plan(p_trainee_id), get_trainee_exercise_progress, get_trainee_insights, get_trainer_dashboard, get_user_profile, recompute_meal_plan_macros, save_meal_plan_as_template, save_plan_as_template, search_trainees, update_user_profile, upsert_supplement_item

## Data model (app schema — see tables.md for full columns)
users, trainers, trainees, vitals, workout_plans, workout_days, workout_day_exercises, workout_sessions, workout_session_sets, exercises, meal_plans, meals, meal_variations, meal_variation_items, trainee_meal_selections, supplement_plans, supplement_items, conversations, conversation_participants, messages, connection_requests, notifications, body_measurements, trainer_templates (+ 7 template_* tables).

Roles: a user is a **trainer** if a row exists in `trainers` for their id; a **trainee** if a row exists in `trainees`. (saqr@gmail.com is a trainee.)

## Design system (port from brand.dart) — dark theme, honey-gold accent
- primary `#F0B51D` (honey gold), primaryDark `#C79516`, primaryLight `#FBCF54`, tertiary `#F9FAB0`
- bg `#09111A`, bgSecondary `#081018`, card `#151E2F`, cardElevated `#1C2540`, inputBg `#141E30`
- border `#1F2D47`, divider `#172238`
- text `#F5F7FA`, textSecondary `#C5CAD7`, textTertiary `#8B93A8`; textOnPrimary `#000`
- success `#34C759`, error `#FF3B30`, warning `#FF9500`, info `#007AFF`
- macros: protein `#FF6B6B`, carbs `#51CF66`, fat `#FFD43B`; meal types: breakfast `#FF9500`, lunch `#34C759`, dinner `#007AFF`, snack `#AF52DE`
- chat bubble self `#2A2520`, other `#1C2038`; read receipt `#53BDEB`
- Radii are generous (cards ~16–24px). Font: clean sans (Inter). Mobile-first.

## Screen inventory (build ALL — "fully working everything")
**Shared/auth:** splash/auth resolver, sign-in, sign-up (role select trainer/trainee), email/phone verification handling, vitals onboarding (multi-step), join-trainer via invite link (`/join/:trainerId`), connection requests (send/accept/reject/cancel), user profile view, units (metric/imperial).
**Trainee:** home (today's workout, trainer card, meals), schedule (workout/meals/supplements tabs), workout session logging (start session, log sets: weight/reps/RPE, complete), meal plan + variation selection, supplements view, progress (exercise charts + body measurements w/ photos), chats list + chat detail, profile edit, body measurements.
**Trainer:** home/dashboard (pending requests, trainee grid, invite/share link), trainee customization workspace (workout builder: plans→days→exercises; meal builder: plans→meals→variations→items; supplements; vitals; measurements), templates (browse/create/apply workout + meal templates), trainee logs/insights, chats, trainer profile edit.

Responsive: bottom tab bar on phone, sidebar on desktop. Every list has loading/empty/error states.

## Deployment
- Repo: this dir is a git repo; create GitHub repo `khaledhaz/fitbook-web` (gh is authed) and deploy via GitHub Pages (static). Owner has a Cloudflare domain — leave a CNAME note; do not attempt interactive `wrangler login`.
- If a `CLOUDFLARE_API_TOKEN` becomes available, prefer Cloudflare Pages.

## QA
- Test account (trainee): `saqr@gmail.com` / `saqr1111` (uid 7bcec53b-…, trainer da9b003c-…).
- For trainer flows, register a marked test trainer via the app's own sign-up (owner authorized full testing; minimize writes; clearly label test data).
- QA mandate: iterate ~20 rounds or until no bugs; live browser test at 375/768/1280; verify horizontal overflow programmatically.
