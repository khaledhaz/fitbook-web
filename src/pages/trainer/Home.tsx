import React, { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  Copy,
  Check,
  UserCheck,
  UserX,
  ChevronRight,
  Share2,
  RefreshCw,
} from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { useUser, useTrainerDashboard, useTrainerTrainees } from '../../lib/api/users'
import { useRespondConnectionRequest } from '../../lib/api/connections'
import { Card, CardHeader, CardTitle } from '../../components/ui/Card'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Skeleton, SkeletonCard } from '../../components/ui/Spinner'
import { EmptyState, ErrorState } from '../../components/ui/States'
import { useToast } from '../../components/ui/Toast'

// ─── Types inferred from RPC ───────────────────────────────────────────────────

interface PendingRequest {
  id: string
  sender_id: string
  sender_name: string | null
  sender_photo: string | null
  created_at: string
  message: string | null
}

interface TraineeSummary {
  trainee_id: string
  user_id: string
  display_name: string | null
  photo_url: string | null
  username: string | null
  last_session_at: string | null
  sessions_this_week: number
}

interface DashboardData {
  pending_requests: PendingRequest[]
  trainees: TraineeSummary[]
  trainer_username: string | null
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export function TrainerHomePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  const userQ = useUser(user?.id)
  const dashQ = useTrainerDashboard(user?.id)
  const traineesQ = useTrainerTrainees(user?.id)

  const respond = useRespondConnectionRequest()

  // Invite link — use trainer's username if known
  const username = userQ.data?.username ?? dashQ.data?.trainer_username
  const inviteLink = username
    ? `${window.location.origin}${window.location.pathname}#/join/${username}`
    : null

  const handleCopy = useCallback(async () => {
    if (!inviteLink) return
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      toast('Invite link copied!', 'success')
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast('Could not copy — try selecting manually.', 'error')
    }
  }, [inviteLink, toast])

  const handleRespond = useCallback(
    async (id: string, status: 'accepted' | 'rejected') => {
      if (!user?.id) return
      try {
        await respond.mutateAsync({ id, status, userId: user.id })
        dashQ.refetch()
        if (status === 'accepted') traineesQ.refetch()
        toast(status === 'accepted' ? 'Request accepted!' : 'Request rejected.', 'success')
      } catch (e) {
        toast((e as Error).message ?? 'Action failed.', 'error')
      }
    },
    [user?.id, respond, dashQ, traineesQ, toast]
  )

  // Dashboard data — try RPC first, fall back to trainees query for grid
  const dashboard = dashQ.data as DashboardData | undefined
  const pendingRequests: PendingRequest[] = dashboard?.pending_requests ?? []
  // Use direct trainees query as the source of truth for the grid (RPC may return partial shape)
  const trainees = traineesQ.data ?? []

  const isLoading = dashQ.isLoading || traineesQ.isLoading
  const isError = dashQ.isError && traineesQ.isError

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-3">
        <div className="min-w-0">
          <p className="text-text-secondary text-sm">{greeting()}</p>
          <h1 className="text-2xl font-bold text-text truncate">
            {userQ.data?.display_name ?? user?.email?.split('@')[0] ?? 'Trainer'}
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => dashQ.refetch()}
            className="p-2 rounded-lg text-text-tertiary hover:text-text hover:bg-card transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Refresh dashboard"
          >
            <RefreshCw className={`w-5 h-5 ${dashQ.isFetching ? 'animate-spin' : ''}`} aria-hidden="true" />
          </button>
          <Avatar src={userQ.data?.photo_url} name={userQ.data?.display_name ?? user?.email} size="md" />
        </div>
      </div>

      <div className="flex flex-col gap-5">
        {/* Error */}
        {isError && !isLoading && (
          <ErrorState
            message="Could not load dashboard data."
            onRetry={() => { dashQ.refetch(); traineesQ.refetch() }}
          />
        )}

        {/* Pending connection requests */}
        {(pendingRequests.length > 0 || dashQ.isLoading) && (
          <section aria-label="Pending connection requests">
            <Card>
              <CardHeader>
                <CardTitle>Connection Requests</CardTitle>
                {pendingRequests.length > 0 && (
                  <span
                    className="text-xs font-semibold bg-primary/20 text-primary rounded-full px-2 py-0.5"
                    aria-label={`${pendingRequests.length} pending`}
                  >
                    {pendingRequests.length}
                  </span>
                )}
              </CardHeader>

              {dashQ.isLoading ? (
                <div className="flex flex-col gap-3">
                  {[1, 2].map((k) => (
                    <div key={k} className="flex items-center gap-3">
                      <Skeleton className="w-11 h-11 rounded-full" />
                      <div className="flex-1 flex flex-col gap-1">
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-3 w-1/3" />
                      </div>
                      <Skeleton className="h-10 w-20 rounded-lg" />
                    </div>
                  ))}
                </div>
              ) : pendingRequests.length === 0 ? (
                <p className="text-text-secondary text-sm">No pending requests.</p>
              ) : (
                <ul className="flex flex-col gap-3" aria-label="Pending requests list">
                  {pendingRequests.map((req) => (
                    <RequestRow
                      key={req.id}
                      request={req}
                      onAccept={() => handleRespond(req.id, 'accepted')}
                      onReject={() => handleRespond(req.id, 'rejected')}
                      isLoading={respond.isPending}
                    />
                  ))}
                </ul>
              )}
            </Card>
          </section>
        )}

        {/* Invite / share section */}
        <section aria-label="Invite link">
          <Card elevated>
            <CardHeader>
              <CardTitle>Invite Trainees</CardTitle>
              <Share2 className="w-5 h-5 text-primary" aria-hidden="true" />
            </CardHeader>
            <p className="text-sm text-text-secondary mb-3">
              Share your personal invite link to let trainees connect with you.
            </p>
            {userQ.isLoading ? (
              <Skeleton className="h-12 w-full rounded-lg" />
            ) : inviteLink ? (
              <div className="flex items-center gap-2">
                <div
                  className="flex-1 min-w-0 bg-input-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text-secondary truncate select-all"
                  role="textbox"
                  aria-label="Invite link"
                  aria-readonly="true"
                >
                  {inviteLink}
                </div>
                <button
                  onClick={handleCopy}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-primary text-text-on-primary font-semibold text-sm hover:bg-primary-dark transition-colors min-h-[44px] min-w-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                  aria-label={copied ? 'Copied!' : 'Copy invite link'}
                >
                  {copied ? (
                    <Check className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Copy className="w-4 h-4" aria-hidden="true" />
                  )}
                  <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            ) : (
              <div>
                <p className="text-xs text-text-tertiary mb-2">
                  Set a username in your profile to generate an invite link.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate('/trainer/profile')}
                >
                  Set username
                </Button>
              </div>
            )}
          </Card>
        </section>

        {/* Trainee grid */}
        <section aria-label="Your trainees">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-text">
              My Trainees
              {trainees.length > 0 && (
                <span className="ml-2 text-sm font-normal text-text-tertiary">
                  ({trainees.length})
                </span>
              )}
            </h2>
            {trainees.length > 0 && (
              <button
                onClick={() => navigate('/trainer/trainees')}
                className="text-sm text-primary hover:text-primary-light transition-colors flex items-center gap-1 min-h-[44px] px-1"
              >
                See all <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((k) => (
                <SkeletonCard key={k} />
              ))}
            </div>
          ) : trainees.length === 0 ? (
            <EmptyState
              icon={<Users className="w-7 h-7 text-text-tertiary" />}
              title="No trainees yet"
              description="Share your invite link to onboard your first trainee."
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {trainees.slice(0, 8).map((t) => (
                <TraineeCard
                  key={t.id}
                  traineeId={t.id}
                  userId={t.id}
                  displayName={t.users?.display_name}
                  photoUrl={t.users?.photo_url}
                  username={t.users?.username}
                  onClick={() => navigate(`/trainer/trainee/${t.id}`)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

interface RequestRowProps {
  request: PendingRequest
  onAccept: () => void
  onReject: () => void
  isLoading: boolean
}

function RequestRow({ request, onAccept, onReject, isLoading }: RequestRowProps) {
  return (
    <li className="flex items-center gap-3">
      <Avatar
        src={request.sender_photo}
        name={request.sender_name}
        size="md"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text truncate">
          {request.sender_name ?? 'Unknown user'}
        </p>
        {request.message && (
          <p className="text-xs text-text-tertiary truncate">{request.message}</p>
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={onAccept}
          disabled={isLoading}
          className="flex items-center justify-center w-10 h-10 rounded-lg bg-success/20 text-success hover:bg-success/30 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success"
          aria-label={`Accept request from ${request.sender_name ?? 'user'}`}
        >
          <UserCheck className="w-4 h-4" aria-hidden="true" />
        </button>
        <button
          onClick={onReject}
          disabled={isLoading}
          className="flex items-center justify-center w-10 h-10 rounded-lg bg-error/20 text-error hover:bg-error/30 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error"
          aria-label={`Reject request from ${request.sender_name ?? 'user'}`}
        >
          <UserX className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </li>
  )
}

interface TraineeCardProps {
  traineeId: string
  userId: string
  displayName: string | null | undefined
  photoUrl: string | null | undefined
  username: string | null | undefined
  onClick: () => void
}

function TraineeCard({ displayName, photoUrl, username, onClick }: TraineeCardProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-3 rounded-lg bg-card border border-border hover:bg-card-elevated hover:border-border-focused transition-colors text-center min-h-[100px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary w-full"
      aria-label={`Open ${displayName ?? 'trainee'}'s workspace`}
    >
      <Avatar src={photoUrl} name={displayName} size="md" />
      <div className="min-w-0 w-full">
        <p className="text-sm font-medium text-text truncate">
          {displayName ?? 'Trainee'}
        </p>
        {username && (
          <p className="text-xs text-text-tertiary truncate">@{username}</p>
        )}
      </div>
    </button>
  )
}
