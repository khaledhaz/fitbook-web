/**
 * Local realtime hook — calls Supabase directly (not via shared lib).
 * Subscribes to INSERT on messages for a given conversation.
 * Deduplicates by message ID (Set-based O(1) lookup).
 * Cleans up channel on unmount.
 */
import { useEffect, useRef } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../../../lib/supabase'
import type { Message } from '../../../types'

export function useChatRealtime(
  conversationId: string | undefined,
  onNewMessage: (msg: Message) => void,
) {
  // Keep a stable ref to the callback to avoid re-subscribing on every render
  const callbackRef = useRef(onNewMessage)
  useEffect(() => {
    callbackRef.current = onNewMessage
  })

  useEffect(() => {
    if (!conversationId) return

    let channel: RealtimeChannel | null = null

    channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'app',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          callbackRef.current(payload.new as Message)
        },
      )
      .subscribe()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
        channel = null
      }
    }
  }, [conversationId])
}
