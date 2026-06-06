/**
 * ChatListPage — conversation list for both trainee (/chats) and trainer (/trainer/chats).
 * Exported as ChatListPage (named export).
 */
import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageSquare, Search, X } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { useConversations } from '../../lib/api/chat'
import { Avatar } from '../../components/ui/Avatar'
import { Skeleton } from '../../components/ui/Spinner'
import { EmptyState, ErrorState } from '../../components/ui/States'
import { formatTimestamp } from './_shared/chatHelpers'
import { supabase } from '../../lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

interface OtherUser {
  id: string
  display_name: string | null
  photo_url: string | null
  username: string | null
}

interface ConversationRow {
  conversation_id: string
  last_message_at: string | null
  last_message_preview: string | null
  last_read_at: string | null
  is_muted: boolean
  conversations: {
    id: string
    last_message_at: string | null
    last_message_preview: string | null
  }
  users?: OtherUser | null
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ChatListPageProps {
  /** When provided, used as a display hint but auth always comes from context */
  roleContext?: 'trainee' | 'trainer'
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isUnread(row: ConversationRow): boolean {
  const lastMsgAt = row.conversations?.last_message_at
  const preview = row.conversations?.last_message_preview
  if (!lastMsgAt || !preview || preview.trim() === '') return false
  const myReadAt = row.last_read_at
  if (!myReadAt) return true
  return new Date(lastMsgAt) > new Date(myReadAt)
}

function getOtherUser(
  participations: ConversationRow[],
  myId: string,
  conversationId: string,
): OtherUser | null {
  // Find the OTHER participant in the same conversation
  const others = participations.filter(
    (p) => p.conversation_id === conversationId && p.users?.id !== myId,
  )
  return others[0]?.users ?? null
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ConversationSkeleton() {
  return (
    <li className="flex items-center gap-3 px-4 py-3" aria-hidden="true">
      <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
      <Skeleton className="h-3 w-8 flex-shrink-0" />
    </li>
  )
}

// ─── Conversation item ────────────────────────────────────────────────────────

interface ConversationItemProps {
  conversationId: string
  otherUser: OtherUser | null
  preview: string | null
  lastMsgAt: string | null
  unread: boolean
  onClick: () => void
}

function ConversationItem({
  conversationId: _conversationId,
  otherUser,
  preview,
  lastMsgAt,
  unread,
  onClick,
}: ConversationItemProps) {
  const name = otherUser?.display_name ?? otherUser?.username ?? 'Unknown'
  const time = formatTimestamp(lastMsgAt)

  return (
    <li>
      <button
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-card-elevated transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
        onClick={onClick}
        aria-label={`Chat with ${name}${unread ? ', unread messages' : ''}`}
      >
        {/* Avatar */}
        <Avatar
          src={otherUser?.photo_url}
          name={name}
          size="md"
          className="flex-shrink-0"
        />

        {/* Name + preview */}
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm truncate ${unread ? 'font-bold text-text' : 'font-medium text-text'}`}
          >
            {name}
          </p>
          <p
            className={`text-xs truncate mt-0.5 ${
              unread ? 'text-text-secondary font-medium' : 'text-text-tertiary'
            }`}
          >
            {preview && preview.trim() !== '' ? preview : 'No messages yet'}
          </p>
        </div>

        {/* Timestamp + unread dot */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {time && (
            <span
              className={`text-[10px] ${unread ? 'text-primary font-bold' : 'text-text-tertiary'}`}
            >
              {time}
            </span>
          )}
          {unread && (
            <span
              className="w-2.5 h-2.5 rounded-full bg-primary"
              aria-label="Unread"
            />
          )}
        </div>
      </button>
    </li>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function ChatListPage({ roleContext: _roleContext }: ChatListPageProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  // Load all participations with nested conversation data
  const { data: participations, isLoading, isError, refetch } = useConversations(user?.id)

  // Deduplicate: one entry per conversation (pick the row where user_id = myId)
  const myParticipations = useMemo(() => {
    if (!participations || !user) return []
    return participations.filter((p) => {
      // The hook filters by user_id=myId already, so all rows are ours
      // but the nested join may return multiple rows; keep unique by conversation_id
      return true
    })
  }, [participations, user])

  // Build a map of conversationId → other user by scanning all participations
  // Since the query fetches conversation_participants with users nested,
  // each row represents one participant. We need the OTHER participant per convo.
  // The existing useConversations hook selects `*, conversations(*)`.
  // It doesn't join users. We'll need to handle this differently.
  // We fetch conversation details (with all participants) per conversation.
  // For the list view, we use useConversation() per item which is heavy.
  // Instead: we load all participations for user, then also load all participants
  // (the full set) via a separate query to get the other user's info.
  // This is handled by a local query below.

  const conversationIds = useMemo(
    () => myParticipations.map((p) => p.conversations?.id ?? p.conversation_id),
    [myParticipations],
  )

  // Load all participants for all our conversations (to find the other person)
  const [allParticipants, setAllParticipants] = React.useState<ConversationRow[]>([])

  React.useEffect(() => {
    if (!conversationIds.length || !user?.id) return
    let cancelled = false

    supabase
      .from('conversation_participants')
      .select('conversation_id, last_read_at, is_muted, users(id, display_name, photo_url, username)')
      .in('conversation_id', conversationIds)
      .neq('user_id', user.id)
      .then(({ data }) => {
        if (!cancelled && data) {
          setAllParticipants(data as unknown as ConversationRow[])
        }
      })

    return () => {
      cancelled = true
    }
  }, [conversationIds.join(','), user?.id])

  // Sorted + filtered conversations
  const sorted = useMemo(() => {
    if (!myParticipations.length) return []
    return [...myParticipations].sort((a, b) => {
      const aTime = a.conversations?.last_message_at ?? ''
      const bTime = b.conversations?.last_message_at ?? ''
      if (aTime && !bTime) return -1
      if (!aTime && bTime) return 1
      return bTime.localeCompare(aTime)
    })
  }, [myParticipations])

  const filtered = useMemo(() => {
    let list = sorted

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((p) => {
        const convoId = p.conversations?.id ?? p.conversation_id
        const other = allParticipants.find((ap) => ap.conversation_id === convoId)
        const otherUser = other?.users as unknown as OtherUser | null
        const name = otherUser?.display_name ?? otherUser?.username ?? ''
        return name.toLowerCase().includes(q)
      })
    }

    if (filter === 'unread') {
      list = list.filter((p) => isUnread(p as unknown as ConversationRow))
    }

    return list
  }, [sorted, search, filter, allParticipants])

  const unreadCount = useMemo(
    () => sorted.filter((p) => isUnread(p as unknown as ConversationRow)).length,
    [sorted],
  )

  function handleItemClick(conversationId: string) {
    navigate(`/chat/${conversationId}`)
  }

  return (
    <div className="flex flex-col flex-1 min-h-0" style={{ height: '100%' }}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="flex-shrink-0 px-4 pt-5 pb-3 border-b border-divider">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="text-2xl font-bold text-text leading-tight">Messages</h1>
            {!isLoading && (
              <p className="text-xs text-text-secondary mt-0.5">
                {sorted.length} conversation{sorted.length !== 1 ? 's' : ''} &middot;{' '}
                {unreadCount} unread
              </p>
            )}
          </div>
          <button
            className="w-10 h-10 rounded-xl bg-card-elevated flex items-center justify-center hover:bg-card-pressed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            onClick={() => {
              setShowSearch((v) => !v)
              if (showSearch) setSearch('')
            }}
            aria-label={showSearch ? 'Close search' : 'Search conversations'}
          >
            {showSearch ? (
              <X className="w-5 h-5 text-text" aria-hidden="true" />
            ) : (
              <Search className="w-5 h-5 text-text" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Search bar */}
        {showSearch && (
          <div className="mt-3">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                placeholder="Search conversations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 bg-input-bg border border-border rounded-xl pl-9 pr-4 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary focus:bg-input-bg-focused transition-colors"
                aria-label="Search conversations"
                autoFocus
              />
            </div>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 mt-3" role="group" aria-label="Filter conversations">
          <FilterTab
            label="All"
            active={filter === 'all'}
            onClick={() => setFilter('all')}
          />
          <FilterTab
            label={`Unread (${unreadCount})`}
            active={filter === 'unread'}
            onClick={() => setFilter('unread')}
          />
        </div>
      </header>

      {/* ── Content ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <ul aria-label="Loading conversations" className="divide-y divide-divider">
            {Array.from({ length: 6 }).map((_, i) => (
              <ConversationSkeleton key={i} />
            ))}
          </ul>
        ) : isError ? (
          <ErrorState
            title="Could not load chats"
            message="Check your connection and try again."
            onRetry={() => refetch()}
            className="py-20"
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<MessageSquare className="w-7 h-7 text-text-tertiary" />}
            title={
              filter === 'unread'
                ? 'No unread messages'
                : search
                ? 'No conversations match'
                : 'No conversations yet'
            }
            description={
              filter === 'unread'
                ? "You're all caught up!"
                : search
                ? 'Try a different name.'
                : 'Connect with a trainer or trainee to start chatting.'
            }
          />
        ) : (
          <ul
            className="divide-y divide-divider"
            aria-label="Conversations"
            role="list"
          >
            {filtered.map((p) => {
              const convoId = (p.conversations as { id?: string })?.id ?? p.conversation_id
              const otherParticipant = allParticipants.find(
                (ap) => ap.conversation_id === convoId,
              )
              const otherUser = otherParticipant
                ? (otherParticipant.users as unknown as OtherUser | null)
                : null

              return (
                <ConversationItem
                  key={convoId}
                  conversationId={convoId}
                  otherUser={otherUser}
                  preview={p.conversations?.last_message_preview ?? null}
                  lastMsgAt={p.conversations?.last_message_at ?? null}
                  unread={isUnread(p as unknown as ConversationRow)}
                  onClick={() => handleItemClick(convoId)}
                />
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

// ─── Filter tab ───────────────────────────────────────────────────────────────

interface FilterTabProps {
  label: string
  active: boolean
  onClick: () => void
}

function FilterTab({ label, active, onClick }: FilterTabProps) {
  return (
    <button
      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[32px] ${
        active
          ? 'bg-primary text-text-on-primary'
          : 'bg-card-elevated text-text-secondary hover:bg-card-pressed'
      }`}
      onClick={onClick}
      aria-pressed={active}
    >
      {label}
    </button>
  )
}
