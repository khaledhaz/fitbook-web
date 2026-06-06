import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import type { ConnectionRequest } from '../../types'

export const connectionKeys = {
  incoming: (userId: string) => ['connection_requests_incoming', userId] as const,
  outgoing: (userId: string) => ['connection_requests_outgoing', userId] as const,
}

export function useIncomingConnectionRequests(userId: string | undefined) {
  return useQuery({
    queryKey: connectionKeys.incoming(userId ?? ''),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('connection_requests')
        .select('*, users!sender_id(*)')
        .eq('receiver_id', userId!)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as (ConnectionRequest & { users: { id: string; display_name: string | null; photo_url: string | null } })[]
    },
  })
}

export function useOutgoingConnectionRequests(userId: string | undefined) {
  return useQuery({
    queryKey: connectionKeys.outgoing(userId ?? ''),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('connection_requests')
        .select('*, users!receiver_id(*)')
        .eq('sender_id', userId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as ConnectionRequest[]
    },
  })
}

export function useSendConnectionRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { sender_id: string; receiver_id: string; type: string; message?: string }) => {
      const { data, error } = await supabase
        .from('connection_requests')
        .insert({ status: 'pending', ...payload })
        .select()
        .single()
      if (error) throw error
      return data as ConnectionRequest
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: connectionKeys.outgoing(data.sender_id) })
    },
  })
}

export function useRespondConnectionRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status, userId }: { id: string; status: 'accepted' | 'rejected'; userId: string }) => {
      const { data, error } = await supabase
        .from('connection_requests')
        .update({ status, responded_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return { ...data as ConnectionRequest, userId }
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: connectionKeys.incoming(data.userId) })
    },
  })
}

export function useCancelConnectionRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      const { error } = await supabase
        .from('connection_requests')
        .update({ status: 'cancelled' })
        .eq('id', id)
      if (error) throw error
      return { userId }
    },
    onSuccess: ({ userId }) => {
      qc.invalidateQueries({ queryKey: connectionKeys.outgoing(userId) })
    },
  })
}

/** RPC: assign_trainer_to_trainee — no p_ prefix on params */
export function useAssignTrainer() {
  return useMutation({
    mutationFn: async ({ traineeId, trainerId }: { traineeId: string; trainerId: string }) => {
      const { data, error } = await supabase.rpc('assign_trainer_to_trainee', {
        trainee_id: traineeId,
        trainer_id: trainerId,
      })
      if (error) throw error
      return data
    },
  })
}
