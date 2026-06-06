import React from 'react'
import {
  HashRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom'
import { useAuth } from './lib/auth'
import { useTrainee } from './lib/api/users'
import { AppShell } from './components/layout/AppShell'
import { PageSpinner } from './components/ui/Spinner'

// Auth pages
import { SplashPage } from './pages/auth/Splash'
import { SignInPage } from './pages/auth/SignIn'
import { SignUpPage } from './pages/auth/SignUp'
import { VitalsOnboardingPage } from './pages/auth/VitalsOnboarding'
import { EmailVerificationPage } from './pages/auth/EmailVerification'

// Trainee pages
import { TraineeHomePage } from './pages/trainee/Home'
import { TraineeProfilePage } from './pages/trainee/Profile'
import { TraineeSchedulePage } from './pages/trainee/Schedule'
import { TraineeWorkoutSessionPage } from './pages/trainee/WorkoutSession'
import { TraineeSessionSummaryPage } from './pages/trainee/SessionSummary'
import { TraineeMealsPage } from './pages/trainee/Meals'
import { TraineeSupplementsPage } from './pages/trainee/Supplements'
import { TraineeProgressPage } from './pages/trainee/Progress'
import { TraineeBodyMeasurementsPage } from './pages/trainee/BodyMeasurements'
import { TraineeUnitsPage } from './pages/trainee/Units'

// Trainer pages
import { TrainerHomePage } from './pages/trainer/Home'
import { TraineesPage } from './pages/trainer/Trainees'
import { TraineeLogsPage } from './pages/trainer/TraineeLogs'
import { TraineeInsightsPage } from './pages/trainer/TraineeInsights'
import { TrainerProfilePage } from './pages/trainer/Profile'
import { TrainerSetupPage } from './pages/trainer/Setup'
import { TrainerTemplatesPage } from './pages/trainer/Templates'
import { TraineeWorkspacePage } from './pages/trainer/customization/TraineeWorkspace'

// Shared pages
import { ConnectionsPage } from './pages/shared/Connections'
import { JoinTrainerPage } from './pages/shared/JoinTrainer'
import { ProfileViewPage } from './pages/shared/ProfileView'

// Chat pages
import { ChatListPage } from './pages/chat/ChatList'
import { ChatDetailPage } from './pages/chat/ChatDetail'

// ─── Auth / role guard ─────────────────────────────────────────────────────────

function AuthResolver() {
  const { user, role, isLoading } = useAuth()
  const traineeQ = useTrainee(user?.id)

  if (isLoading) return <SplashPage />
  if (!user) return <Navigate to="/signin" replace />
  if (role === 'loading') return <SplashPage />

  if (role === 'trainee') {
    if (traineeQ.isLoading) return <SplashPage />
    const hasVitals = !!traineeQ.data?.vital_id
    if (!hasVitals) return <Navigate to="/vitals" replace />
    return <Navigate to="/home" replace />
  }

  if (role === 'trainer') {
    return <Navigate to="/trainer/home" replace />
  }

  return <Navigate to="/signin" replace />
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  if (isLoading) return <PageSpinner />
  if (!user) return <Navigate to="/signin" replace />
  return <>{children}</>
}

function RequireTrainee({ children }: { children: React.ReactNode }) {
  const { user, role, isLoading } = useAuth()
  const traineeQ = useTrainee(user?.id)

  if (isLoading || role === 'loading') return <PageSpinner />
  if (!user) return <Navigate to="/signin" replace />
  if (role === 'trainer') return <Navigate to="/trainer/home" replace />

  if (traineeQ.isLoading) return <PageSpinner />
  const hasVitals = !!traineeQ.data?.vital_id
  if (!hasVitals) return <Navigate to="/vitals" replace />

  return <>{children}</>
}

function RequireTrainer({ children }: { children: React.ReactNode }) {
  const { user, role, isLoading } = useAuth()
  if (isLoading || role === 'loading') return <PageSpinner />
  if (!user) return <Navigate to="/signin" replace />
  if (role === 'trainee') return <Navigate to="/home" replace />
  if (role === 'none') return <Navigate to="/signin" replace />
  return <>{children}</>
}

// ─── Layout wrappers ───────────────────────────────────────────────────────────

function TraineeShell({ children }: { children: React.ReactNode }) {
  return (
    <RequireTrainee>
      <AppShell>{children}</AppShell>
    </RequireTrainee>
  )
}

function TrainerShell({ children }: { children: React.ReactNode }) {
  return (
    <RequireTrainer>
      <AppShell>{children}</AppShell>
    </RequireTrainer>
  )
}

/** For routes used by BOTH roles (profile view, chat detail). */
function AuthedShell({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <AppShell>{children}</AppShell>
    </RequireAuth>
  )
}

// ─── Router ────────────────────────────────────────────────────────────────────

export function AppRouter() {
  return (
    <HashRouter>
      <Routes>
        {/* Public / auth routes */}
        <Route path="/" element={<RequireAuth><AuthResolver /></RequireAuth>} />
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/email-verification" element={<RequireAuth><EmailVerificationPage /></RequireAuth>} />
        <Route path="/vitals" element={<RequireAuth><VitalsOnboardingPage /></RequireAuth>} />
        <Route path="/join/:username" element={<RequireAuth><JoinTrainerPage /></RequireAuth>} />

        {/* Shared (either role) */}
        <Route path="/profile/view/:userId" element={<AuthedShell><ProfileViewPage /></AuthedShell>} />
        <Route path="/chat/:conversationId" element={<AuthedShell><ChatDetailPage /></AuthedShell>} />

        {/* ─── Trainee routes ───────────────────────── */}
        <Route path="/home" element={<TraineeShell><TraineeHomePage /></TraineeShell>} />
        <Route path="/schedule" element={<TraineeShell><TraineeSchedulePage /></TraineeShell>} />
        <Route path="/progress" element={<TraineeShell><TraineeProgressPage /></TraineeShell>} />
        <Route path="/chats" element={<TraineeShell><ChatListPage /></TraineeShell>} />
        <Route path="/profile" element={<TraineeShell><TraineeProfilePage /></TraineeShell>} />
        <Route path="/workout/session" element={<TraineeShell><TraineeWorkoutSessionPage /></TraineeShell>} />
        <Route path="/workout/session-summary/:sessionId" element={<TraineeShell><TraineeSessionSummaryPage /></TraineeShell>} />
        <Route path="/meals" element={<TraineeShell><TraineeMealsPage /></TraineeShell>} />
        <Route path="/supplements" element={<TraineeShell><TraineeSupplementsPage /></TraineeShell>} />
        <Route path="/body-measurements" element={<TraineeShell><TraineeBodyMeasurementsPage /></TraineeShell>} />
        <Route path="/units" element={<TraineeShell><TraineeUnitsPage /></TraineeShell>} />
        <Route path="/connections" element={<TraineeShell><ConnectionsPage /></TraineeShell>} />

        {/* ─── Trainer routes ───────────────────────── */}
        <Route path="/trainer/home" element={<TrainerShell><TrainerHomePage /></TrainerShell>} />
        <Route path="/trainer/trainees" element={<TrainerShell><TraineesPage /></TrainerShell>} />
        <Route path="/trainer/trainee/:traineeId" element={<TrainerShell><TraineeWorkspacePage /></TrainerShell>} />
        <Route path="/trainer/trainee/:traineeId/logs" element={<TrainerShell><TraineeLogsPage /></TrainerShell>} />
        <Route path="/trainer/trainee/:traineeId/insights" element={<TrainerShell><TraineeInsightsPage /></TrainerShell>} />
        <Route path="/trainer/templates" element={<TrainerShell><TrainerTemplatesPage /></TrainerShell>} />
        <Route path="/trainer/profile" element={<TrainerShell><TrainerProfilePage /></TrainerShell>} />
        <Route path="/trainer/setup" element={<RequireAuth><TrainerSetupPage /></RequireAuth>} />
        <Route path="/trainer/chats" element={<TrainerShell><ChatListPage roleContext="trainer" /></TrainerShell>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
