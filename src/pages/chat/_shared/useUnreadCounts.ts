/**
 * Local hook to compute unread counts from conversation_participants.
 * Uses last_read_at vs conversations.last_message_at to derive per-conversation
 * unread booleans — no batch API call needed (direct Supabase read).
 */
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'

interface ParticipantRow {
  conversation_id: string
  last_read_at: string | null
}

/**
 * Returns a map of conversationId → boolean (true = has unread).
 */
export function useUnreadMap(
  userId: string | undefined,
  conversationIds: string[],
): Record<string, boolean> {
  const { data } = useQuery({
    queryKey: ['chat-unread-map', userId, conversationIds.join(',')],
    enabled: !!userId && conversationIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversation_participants')
        .select('conversation_id, last_read_at')
        .eq('user_id', userId!)
        .in('conversation_id', conversationIds)
      if (error) throw error
      return (data ?? []) as ParticipantRow[]
    },
    staleTime: 30_000,
  })

  if (!data) return {}

  const map: Record<string, boolean> = {}
  // We can't easily check against last_message_at here without joining,
  // so we expose last_read_at keyed by conversation_id and let ChatList
  // compare against its own conversation data.
  for (const row of data) {
    map[row.conversation_id] = row.last_read_at === null
  }
  return map
}

/**
 * Returns the current user's last_read_at for a given conversation.
 */
export function useMyLastReadAt(
  conversationId: string | undefined,
  userId: string | undefined,
) {
  return useQuery({
    queryKey: ['my-last-read-at', conversationId, userId],
    enabled: !!conversationId && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversation_participants')
        .select('last_read_at')
        .eq('conversation_id', conversationId!)
        .eq('user_id', userId!)
        .maybeSingle()
      if (error) throw error
      return data?.last_read_at as string | null
    },
    staleTime: 30_000,
  })
}

/**
 * Returns the OTHER participant's last_read_at (for read receipts display).
 */
export function useOtherLastReadAt(
  conversationId: string | undefined,
  myId: string | undefined,
) {
  return useQuery({
    queryKey: ['other-last-read-at', conversationId, myId],
    enabled: !!conversationId && !!myId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversation_participants')
        .select('last_read_at')
        .eq('conversation_id', conversationId!)
        .neq('user_id', myId!)
        .maybeSingle()
      if (error) throw error
      return data?.last_read_at as string | null
    },
    staleTime: 30_000,
  })
}
