/**
 * Subscribes to UPDATE on conversation_participants to track the OTHER
 * participant's last_read_at in real time (blue read-receipt ticks).
 */
import { useEffect, useRef } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../../../lib/supabase'

export function useReadReceiptRealtime(
  conversationId: string | undefined,
  myId: string | undefined,
  onOtherRead: (lastReadAt: string) => void,
) {
  const callbackRef = useRef(onOtherRead)
  useEffect(() => {
    callbackRef.current = onOtherRead
  })

  useEffect(() => {
    if (!conversationId || !myId) return

    let channel: RealtimeChannel | null = null

    channel = supabase
      .channel(`read-receipts-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'app',
          table: 'conversation_participants',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const record = payload.new as { user_id: string; last_read_at: string | null }
          // Only care about the OTHER participant's read status
          if (record.user_id !== myId && record.last_read_at) {
            callbackRef.current(record.last_read_at)
          }
        },
      )
      .subscribe()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
        channel = null
      }
    }
  }, [conversationId, myId])
}
