import React, { useState, useId } from 'react'
import { Search, UserPlus, UserCheck, UserX, Clock, Users, X } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import {
  useIncomingConnectionRequests,
  useOutgoingConnectionRequests,
  useRespondConnectionRequest,
  useCancelConnectionRequest,
  useSendConnectionRequest,
} from '../../lib/api/connections'
import { useSearchTrainees } from '../../lib/api/users'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Skeleton } from '../../components/ui/Spinner'
import { EmptyState, ErrorState } from '../../components/ui/States'
import { useToast } from '../../components/ui/Toast'
import { cn } from '../../utils/cn'

// ─── Tab types ───────────────────────────────────────────────────────────────

type Tab = 'incoming' | 'outgoing' | 'search'

// ─── Page ────────────────────────────────────────────────────────────────────

export function ConnectionsPage() {
  const { user, role } = useAuth()
  const [tab, setTab] = useState<Tab>('incoming')
  const [searchQuery, setSearchQuery] = useState('')
  const searchId = useId()

  const incomingQ = useIncomingConnectionRequests(user?.id)
  const outgoingQ = useOutgoingConnectionRequests(user?.id)
  const respond = useRespondConnectionRequest()
  const cancel = useCancelConnectionRequest()
  const send = useSendConnectionRequest()
  const searchMut = useSearchTrainees()
  const { toast } = useToast()

  const handleAccept = async (id: string) => {
    if (!user) return
    try {
      await respond.mutateAsync({ id, status: 'accepted', userId: user.id })
      toast('Connection accepted!', 'success')
    } catch (e) {
      toast((e as Error).message ?? 'Failed to accept', 'error')
    }
  }

  const handleReject = async (id: string) => {
    if (!user) return
    try {
      await respond.mutateAsync({ id, status: 'rejected', userId: user.id })
      toast('Request declined.', 'info')
    } catch (e) {
      toast((e as Error).message ?? 'Failed to reject', 'error')
    }
  }

  const handleCancel = async (id: string) => {
    if (!user) return
    try {
      await cancel.mutateAsync({ id, userId: user.id })
      toast('Request cancelled.', 'info')
    } catch (e) {
      toast((e as Error).message ?? 'Failed to cancel', 'error')
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    try {
      await searchMut.mutateAsync(searchQuery.trim())
    } catch (e) {
      toast((e as Error).message ?? 'Search failed', 'error')
    }
  }

  const handleSendRequest = async (receiverId: string) => {
    if (!user) return
    try {
      await send.mutateAsync({
        sender_id: user.id,
        receiver_id: receiverId,
        type: 'trainer_request',
      })
      toast('Connection request sent!', 'success')
    } catch (e) {
      toast((e as Error).message ?? 'Failed to send request', 'error')
    }
  }

  const tabs: { id: Tab; label: string; count?: number }[] = [
    {
      id: 'incoming',
      label: 'Incoming',
      count: incomingQ.data?.length,
    },
    { id: 'outgoing', label: 'Outgoing' },
    ...(role === 'trainee' ? [{ id: 'search' as Tab, label: 'Find Trainer' }] : []),
  ]

  return (
    <div className="page-container">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">Connections</h1>
        <p className="text-sm text-text-secondary mt-1">
          Manage your trainer–trainee connections
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-card-elevated rounded-lg mb-6" role="tablist" aria-label="Connection tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            aria-controls={`tabpanel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors min-h-[44px]',
              tab === t.id
                ? 'bg-primary text-text-on-primary'
                : 'text-text-secondary hover:text-text hover:bg-card'
            )}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span
                className={cn(
                  'inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold',
                  tab === t.id ? 'bg-black/20 text-text-on-primary' : 'bg-error text-white'
                )}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Incoming */}
      <div
        id="tabpanel-incoming"
        role="tabpanel"
        aria-label="Incoming requests"
        hidden={tab !== 'incoming'}
        className={tab !== 'incoming' ? 'hidden' : undefined}
      >
        {incomingQ.isLoading ? (
          <ConnectionSkeletonList />
        ) : incomingQ.isError ? (
          <ErrorState message="Could not load incoming requests." onRetry={() => incomingQ.refetch()} />
        ) : !incomingQ.data?.length ? (
          <EmptyState
            icon={<UserCheck className="w-7 h-7 text-text-tertiary" />}
            title="No pending requests"
            description="When someone sends you a connection request, it will appear here."
          />
        ) : (
          <ul className="flex flex-col gap-3" aria-label="Incoming connection requests">
            {incomingQ.data.map((req) => (
              <li key={req.id}>
                <Card className="flex items-center gap-3 min-w-0">
                  <Avatar
                    src={req.users?.photo_url}
                    name={req.users?.display_name}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text truncate">
                      {req.users?.display_name ?? 'Unknown'}
                    </p>
                    <p className="text-xs text-text-tertiary mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" aria-hidden="true" />
                      {formatRelativeDate(req.created_at)}
                    </p>
                    {req.message && (
                      <p className="text-xs text-text-secondary mt-1 truncate">
                        "{req.message}"
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="primary"
                      size="sm"
                      aria-label={`Accept request from ${req.users?.display_name ?? 'user'}`}
                      onClick={() => handleAccept(req.id)}
                      isLoading={respond.isPending}
                    >
                      Accept
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Reject request from ${req.users?.display_name ?? 'user'}`}
                      onClick={() => handleReject(req.id)}
                      isLoading={respond.isPending}
                    >
                      <UserX className="w-4 h-4 text-error" aria-hidden="true" />
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Outgoing */}
      <div
        id="tabpanel-outgoing"
        role="tabpanel"
        aria-label="Outgoing requests"
        hidden={tab !== 'outgoing'}
        className={tab !== 'outgoing' ? 'hidden' : undefined}
      >
        {outgoingQ.isLoading ? (
          <ConnectionSkeletonList />
        ) : outgoingQ.isError ? (
          <ErrorState message="Could not load outgoing requests." onRetry={() => outgoingQ.refetch()} />
        ) : !outgoingQ.data?.length ? (
          <EmptyState
            icon={<UserPlus className="w-7 h-7 text-text-tertiary" />}
            title="No outgoing requests"
            description="Requests you've sent will appear here."
          />
        ) : (
          <ul className="flex flex-col gap-3" aria-label="Outgoing connection requests">
            {outgoingQ.data.map((req) => (
              <li key={req.id}>
                <Card className="flex items-center gap-3 min-w-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text truncate">
                      Request #{req.id.slice(0, 8)}
                    </p>
                    <p className="text-xs text-text-tertiary mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" aria-hidden="true" />
                      {formatRelativeDate(req.created_at)}
                    </p>
                  </div>
                  <StatusBadge status={req.status} />
                  {req.status === 'pending' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Cancel this request"
                      onClick={() => handleCancel(req.id)}
                      isLoading={cancel.isPending}
                    >
                      <X className="w-4 h-4 text-text-tertiary" aria-hidden="true" />
                    </Button>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Search (trainee only) */}
      {role === 'trainee' && (
        <div
          id="tabpanel-search"
          role="tabpanel"
          aria-label="Find a trainer"
          hidden={tab !== 'search'}
          className={tab !== 'search' ? 'hidden' : undefined}
        >
          <div className="flex gap-2 mb-4">
            <label htmlFor={searchId} className="sr-only">
              Search trainers by name or username
            </label>
            <div className="flex-1 relative min-w-0">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none"
                aria-hidden="true"
              />
              <input
                id={searchId}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search by name or username…"
                className="w-full h-[52px] bg-input-bg border border-border rounded-md pl-10 pr-4 text-text placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <Button
              onClick={handleSearch}
              isLoading={searchMut.isPending}
              aria-label="Search trainers"
            >
              Search
            </Button>
          </div>

          {searchMut.isPending ? (
            <ConnectionSkeletonList />
          ) : searchMut.isError ? (
            <ErrorState message="Search failed. Try again." />
          ) : searchMut.data && (searchMut.data as unknown[]).length === 0 ? (
            <EmptyState
              icon={<Users className="w-7 h-7 text-text-tertiary" />}
              title="No trainers found"
              description="Try a different name or username."
            />
          ) : searchMut.data ? (
            <ul className="flex flex-col gap-3" aria-label="Search results">
              {(searchMut.data as Array<{ id: string; display_name: string | null; photo_url: string | null; username: string | null }>).map(
                (trainer) => (
                  <li key={trainer.id}>
                    <Card className="flex items-center gap-3 min-w-0">
                      <Avatar
                        src={trainer.photo_url}
                        name={trainer.display_name}
                        size="md"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-text truncate">
                          {trainer.display_name ?? 'Trainer'}
                        </p>
                        {trainer.username && (
                          <p className="text-xs text-text-tertiary truncate">
                            @{trainer.username}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<UserPlus className="w-4 h-4" aria-hidden="true" />}
                        onClick={() => handleSendRequest(trainer.id)}
                        isLoading={send.isPending}
                        aria-label={`Send connection request to ${trainer.display_name ?? 'trainer'}`}
                      >
                        Connect
                      </Button>
                    </Card>
                  </li>
                )
              )}
            </ul>
          ) : (
            <EmptyState
              icon={<Search className="w-7 h-7 text-text-tertiary" />}
              title="Find your trainer"
              description="Search by name or username to send a connection request."
            />
          )}
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    pending: { label: 'Pending', className: 'bg-warning/10 text-warning border-warning/30' },
    accepted: { label: 'Accepted', className: 'bg-success/10 text-success border-success/30' },
    rejected: { label: 'Rejected', className: 'bg-error/10 text-error border-error/30' },
    cancelled: { label: 'Cancelled', className: 'bg-card-elevated text-text-tertiary border-border' },
  }
  const cfg = map[status] ?? { label: status, className: 'bg-card-elevated text-text-tertiary border-border' }
  return (
    <span className={cn('text-xs font-semibold px-2 py-1 rounded-full border', cfg.className)}>
      {cfg.label}
    </span>
  )
}

function ConnectionSkeletonList() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading connections">
      {[0, 1, 2].map((i) => (
        <div key={i} className="bg-card border border-border rounded-lg p-4 flex items-center gap-3">
          <Skeleton className="w-11 h-11 rounded-full flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <Skeleton className="h-4 w-32 mb-2" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-9 w-20 rounded-lg" />
        </div>
      ))}
    </div>
  )
}

function formatRelativeDate(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60_000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    return `${days}d ago`
  } catch {
    return ''
  }
}
