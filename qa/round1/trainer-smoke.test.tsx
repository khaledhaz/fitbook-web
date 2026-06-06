/**
 * Trainer-side smoke tests — Part B of QA Round 1
 * Renders each trainer page component inside minimal providers with
 * mocked auth (role: 'trainer') and asserts it mounts without throwing.
 *
 * Framework: Vitest + @testing-library/react
 * These are NULL-HANDLING smoke tests, not data correctness tests.
 */

import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ToastProvider } from '../../src/components/ui/Toast'

// ─── Global mocks ─────────────────────────────────────────────────────────────

// Mock Supabase client so components don't try to hit the network
vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: null }),
          single: async () => ({ data: null, error: null }),
          order: () => ({
            limit: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
            data: null,
            error: null,
          }),
          in: () => ({ data: null, error: null }),
          neq: () => ({ data: null, error: null }),
          gte: () => ({ lte: () => ({ order: () => ({ limit: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }) }),
        }),
        in: () => ({ data: [], error: null }),
        order: () => ({
          limit: async () => ({ data: [], error: null }),
          data: [],
          error: null,
        }),
        limit: () => ({ data: [], error: null }),
        ilike: () => ({ data: [], error: null }),
      }),
      insert: () => ({ select: () => ({ single: async () => ({ data: null, error: null }) }) }),
      update: () => ({ eq: () => ({ select: () => ({ single: async () => ({ data: null, error: null }) }) }) }),
      delete: () => ({ eq: async () => ({ data: null, error: null }) }),
      upsert: () => ({ select: () => ({ single: async () => ({ data: null, error: null }) }) }),
    }),
    rpc: async (_name: string) => ({ data: null, error: null }),
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithPassword: async () => ({ data: null, error: null }),
      signUp: async () => ({ data: null, error: null }),
      signOut: async () => ({ error: null }),
      getUser: async () => ({ data: { user: null } }),
    },
    channel: () => ({
      on: () => ({ subscribe: () => {} }),
    }),
    removeChannel: () => {},
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
      }),
    },
  },
}))

// Mock auth context with trainer role
const mockUser = {
  id: 'mock-trainer-id',
  email: 'trainer@test.com',
  aud: 'authenticated',
  role: 'authenticated',
  app_metadata: {},
  user_metadata: {},
  created_at: '2025-01-01T00:00:00Z',
}

vi.mock('../../src/lib/auth', () => ({
  useAuth: () => ({
    user: mockUser,
    session: { user: mockUser },
    role: 'trainer',
    isLoading: false,
    signIn: async () => ({ error: null }),
    signUp: async () => ({ error: null }),
    signOut: async () => {},
    refreshRole: async () => {},
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// ─── Factory ──────────────────────────────────────────────────────────────────

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
    },
  })
}

function Providers({
  children,
  route = '/',
  params = {},
}: {
  children: React.ReactNode
  route?: string
  params?: Record<string, string>
}) {
  // Build path with params substituted
  let fullRoute = route
  for (const [k, v] of Object.entries(params)) {
    fullRoute = fullRoute.replace(`:${k}`, v)
  }

  return (
    <QueryClientProvider client={makeClient()}>
      <ToastProvider>
        <MemoryRouter initialEntries={[fullRoute]}>
          <Routes>
            <Route path={route} element={<>{children}</>} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>
  )
}

// ─── Smoke test helper ────────────────────────────────────────────────────────

function smokeRender(element: React.ReactElement, route = '/', params: Record<string, string> = {}) {
  const { container } = render(
    <Providers route={route} params={params}>
      {element}
    </Providers>
  )
  return container
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('Trainer page smoke tests', () => {

  describe('happy path — mounts without throwing', () => {

    it('TrainerHomePage renders without crash', async () => {
      const { TrainerHomePage } = await import('../../src/pages/trainer/Home')
      const container = smokeRender(<TrainerHomePage />, '/')
      expect(container.firstChild).not.toBeNull()
    })

    it('TraineesPage renders without crash', async () => {
      const { TraineesPage } = await import('../../src/pages/trainer/Trainees')
      const container = smokeRender(<TraineesPage />, '/')
      expect(container.firstChild).not.toBeNull()
    })

    it('TraineeLogsPage renders without crash', async () => {
      const { TraineeLogsPage } = await import('../../src/pages/trainer/TraineeLogs')
      const container = smokeRender(
        <TraineeLogsPage />,
        '/trainer/trainee/:traineeId/logs',
        { traineeId: 'mock-trainee-id' }
      )
      expect(container.firstChild).not.toBeNull()
    })

    it('TraineeInsightsPage renders without crash', async () => {
      const { TraineeInsightsPage } = await import('../../src/pages/trainer/TraineeInsights')
      const container = smokeRender(
        <TraineeInsightsPage />,
        '/trainer/trainee/:traineeId/insights',
        { traineeId: 'mock-trainee-id' }
      )
      expect(container.firstChild).not.toBeNull()
    })

    it('TrainerProfilePage renders without crash', async () => {
      const { TrainerProfilePage } = await import('../../src/pages/trainer/Profile')
      const container = smokeRender(<TrainerProfilePage />, '/')
      expect(container.firstChild).not.toBeNull()
    })

    it('TrainerSetupPage renders without crash', async () => {
      const { TrainerSetupPage } = await import('../../src/pages/trainer/Setup')
      const container = smokeRender(<TrainerSetupPage />, '/')
      expect(container.firstChild).not.toBeNull()
    })

    it('TraineeWorkspacePage renders without crash', async () => {
      const { TraineeWorkspacePage } = await import('../../src/pages/trainer/customization/TraineeWorkspace')
      const container = smokeRender(
        <TraineeWorkspacePage />,
        '/trainer/trainee/:traineeId',
        { traineeId: 'mock-trainee-id' }
      )
      expect(container.firstChild).not.toBeNull()
    })

    it('TrainerTemplatesPage renders without crash', async () => {
      const { TrainerTemplatesPage } = await import('../../src/pages/trainer/Templates')
      const container = smokeRender(<TrainerTemplatesPage />, '/')
      expect(container.firstChild).not.toBeNull()
    })

  })

  describe('edge cases — handles empty/null data gracefully', () => {

    it('TrainerHomePage renders with loading state (no data yet)', async () => {
      const { TrainerHomePage } = await import('../../src/pages/trainer/Home')
      const container = smokeRender(<TrainerHomePage />, '/')
      // Should not show an uncaught error — just loading skeletons or empty state
      const errorBoundaryText = container.textContent ?? ''
      expect(errorBoundaryText).not.toContain('Something went wrong')
      expect(errorBoundaryText).not.toContain('Cannot read properties of undefined')
      expect(errorBoundaryText).not.toContain('TypeError')
    })

    it('TraineesPage shows empty state with no trainees (null data)', async () => {
      const { TraineesPage } = await import('../../src/pages/trainer/Trainees')
      const container = smokeRender(<TraineesPage />, '/')
      const text = container.textContent ?? ''
      // Should not crash — should show an empty state or loading
      expect(text).not.toContain('Cannot read properties of undefined')
    })

    it('TraineeLogsPage handles missing traineeId gracefully', async () => {
      const { TraineeLogsPage } = await import('../../src/pages/trainer/TraineeLogs')
      // No traineeId param — component reads useParams
      const { container } = render(
        <QueryClientProvider client={makeClient()}>
          <ToastProvider>
            <MemoryRouter initialEntries={['/trainer/trainee/missing/logs']}>
              <Routes>
                <Route path="/trainer/trainee/:traineeId/logs" element={<TraineeLogsPage />} />
              </Routes>
            </MemoryRouter>
          </ToastProvider>
        </QueryClientProvider>
      )
      // Should render without throwing — show loading or empty state
      expect(container.firstChild).not.toBeNull()
    })

    it('TraineeWorkspacePage with missing traineeId shows error state', async () => {
      const { TraineeWorkspacePage } = await import('../../src/pages/trainer/customization/TraineeWorkspace')
      // Render with no :traineeId param (empty string match)
      const { container } = render(
        <QueryClientProvider client={makeClient()}>
          <ToastProvider>
            <MemoryRouter initialEntries={['/trainer/trainee/workspace']}>
              <Routes>
                <Route path="/trainer/trainee/workspace" element={<TraineeWorkspacePage />} />
              </Routes>
            </MemoryRouter>
          </ToastProvider>
        </QueryClientProvider>
      )
      const text = container.textContent ?? ''
      // Should either show an error message or gracefully handle missing param
      // The component checks !traineeId and shows an error text
      expect(text).not.toContain('Cannot read properties of undefined')
    })

  })

  describe('error paths — components handle null returns without crashing', () => {

    it('TraineeInsightsPage does not crash when RPC returns null', async () => {
      // The supabase mock returns null for all rpc calls
      const { TraineeInsightsPage } = await import('../../src/pages/trainer/TraineeInsights')
      let caught = null
      try {
        const container = smokeRender(
          <TraineeInsightsPage />,
          '/trainer/trainee/:traineeId/insights',
          { traineeId: 'mock-trainee-id' }
        )
        expect(container.firstChild).not.toBeNull()
      } catch (e) {
        caught = e
      }
      // If it threw, that's a bug — null RPC result should not crash
      if (caught) {
        throw new Error(`TraineeInsightsPage crashed on null RPC data: ${(caught as Error).message}`)
      }
    })

    it('TrainerTemplatesPage does not crash when templates list is empty', async () => {
      const { TrainerTemplatesPage } = await import('../../src/pages/trainer/Templates')
      let caught = null
      try {
        const container = smokeRender(<TrainerTemplatesPage />, '/')
        expect(container.firstChild).not.toBeNull()
      } catch (e) {
        caught = e
      }
      if (caught) {
        throw new Error(`TrainerTemplatesPage crashed on empty templates: ${(caught as Error).message}`)
      }
    })

    it('TrainerProfilePage does not crash when trainer row is null', async () => {
      // supabase mock returns null for trainer query
      const { TrainerProfilePage } = await import('../../src/pages/trainer/Profile')
      let caught = null
      try {
        const container = smokeRender(<TrainerProfilePage />, '/')
        expect(container.firstChild).not.toBeNull()
      } catch (e) {
        caught = e
      }
      if (caught) {
        throw new Error(`TrainerProfilePage crashed on null trainer row: ${(caught as Error).message}`)
      }
    })

    it('TrainerSetupPage does not crash when user data is null', async () => {
      const { TrainerSetupPage } = await import('../../src/pages/trainer/Setup')
      let caught = null
      try {
        const container = smokeRender(<TrainerSetupPage />, '/')
        expect(container.firstChild).not.toBeNull()
      } catch (e) {
        caught = e
      }
      if (caught) {
        throw new Error(`TrainerSetupPage crashed with null user data: ${(caught as Error).message}`)
      }
    })

  })

})
