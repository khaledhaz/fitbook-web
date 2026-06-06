import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Dumbbell, Utensils, Pill, Heart, Ruler } from 'lucide-react'
import { useUser } from '../../../lib/api/users'
import { Avatar } from '../../../components/ui/Avatar'
import { Skeleton } from '../../../components/ui/Spinner'
import { Tabs, TabList, Tab, TabPanel } from '../../../components/ui/Tabs'
import { WorkoutBuilder } from './WorkoutBuilder'
import { MealBuilder } from './MealBuilder'
import { SupplementEditor } from './SupplementEditor'
import { VitalsEditor } from './VitalsEditor'
import { MeasurementsView } from './MeasurementsView'

// ─── Tab configuration ────────────────────────────────────────────────────────

const TABS = [
  { id: 'workout', label: 'Workout', icon: Dumbbell },
  { id: 'meals', label: 'Meals', icon: Utensils },
  { id: 'supplements', label: 'Supps', icon: Pill },
  { id: 'vitals', label: 'Vitals', icon: Heart },
  { id: 'measurements', label: 'Stats', icon: Ruler },
] as const

type TabId = (typeof TABS)[number]['id']

// ─── Header ───────────────────────────────────────────────────────────────────

function WorkspaceHeader({ traineeId }: { traineeId: string }) {
  const navigate = useNavigate()
  const userQ = useUser(traineeId)
  const user = userQ.data

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-divider bg-bg sticky top-0 z-20">
      <button
        onClick={() => navigate(-1)}
        className="p-2 rounded-lg hover:bg-card text-text-tertiary hover:text-text transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0"
        aria-label="Go back"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      {userQ.isLoading ? (
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Skeleton className="w-11 h-11 rounded-full flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <Skeleton className="h-4 w-32 mb-1" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar
            src={user?.photo_url}
            name={user?.display_name ?? user?.username}
            size="md"
          />
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-text truncate">
              {user?.display_name ?? user?.username ?? 'Trainee'}
            </p>
            {user?.username && (
              <p className="text-xs text-text-tertiary truncate">@{user.username}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function TraineeWorkspacePage() {
  const { traineeId } = useParams<{ traineeId: string }>()

  if (!traineeId) {
    return (
      <div className="page-container">
        <p className="text-error text-center py-12">Missing trainee ID in URL.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-0">
      <WorkspaceHeader traineeId={traineeId} />

      <Tabs defaultTab="workout" className="flex-1 min-w-0">
        {/* Tab list — scrollable on mobile */}
        <div className="sticky top-[73px] z-10 bg-bg border-b border-divider px-4 py-2">
          <TabList className="overflow-x-auto">
            {TABS.map(({ id, label, icon: Icon }) => (
              <Tab key={id} id={id}>
                <span className="flex items-center gap-1.5">
                  <Icon className="w-4 h-4" aria-hidden="true" />
                  <span>{label}</span>
                </span>
              </Tab>
            ))}
          </TabList>
        </div>

        {/* Tab panels */}
        <TabPanel id="workout">
          <WorkoutBuilder traineeId={traineeId} />
        </TabPanel>
        <TabPanel id="meals">
          <MealBuilder traineeId={traineeId} />
        </TabPanel>
        <TabPanel id="supplements">
          <SupplementEditor traineeId={traineeId} />
        </TabPanel>
        <TabPanel id="vitals">
          <VitalsEditor traineeId={traineeId} />
        </TabPanel>
        <TabPanel id="measurements">
          <MeasurementsView traineeId={traineeId} />
        </TabPanel>
      </Tabs>
    </div>
  )
}
