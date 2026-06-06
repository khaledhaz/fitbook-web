import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { supabase } from '../supabase'
import type { Conversation, ConversationParticipant, Message } from '../../types'

export const chatKeys = {
  conversations: ['conversations'] as const,
  conversation: (id: string) => ['conversation', id] as const,
  messages: (conversationId: string) => ['messages', conversationId] as const,
}

export function useConversations(userId: string | undefined) {
  return useQuery({
    queryKey: chatKeys.conversations,
    enabled: !!userId,
    queryFn: async () => {
      // Get conversations where user is a participant
      const { data: participations, error: pErr } = await supabase
        .from('conversation_participants')
        .select('*, conversations(*)')
        .eq('user_id', userId!)
        .order('conversations(last_message_at)', { ascending: false })
      if (pErr) throw pErr
      return (participations ?? []) as (ConversationParticipant & { conversations: Conversation })[]
    },
  })
}

export function useConversation(conversationId: string | undefined) {
  return useQuery({
    queryKey: chatKeys.conversation(conversationId ?? ''),
    enabled: !!conversationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('*, conversation_participants(*, users(*))')
        .eq('id', conversationId!)
        .single()
      if (error) throw error
      return data as Conversation & { conversation_participants: (ConversationParticipant & { users: { id: string; display_name: string | null; photo_url: string | null } })[] }
    },
  })
}

export function useMessages(conversationId: string | undefined) {
  return useInfiniteQuery({
    queryKey: chatKeys.messages(conversationId ?? ''),
    enabled: !!conversationId,
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      (lastPage as Message[]).length === 30 ? allPages.length * 30 : undefined,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId!)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range((pageParam as number), (pageParam as number) + 29)
      if (error) throw error
      return (data ?? []) as Message[]
    },
  })
}

export function useSendMessage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      conversation_id: string
      sender_id: string
      content: string
      type?: string
    }) => {
      const { data, error } = await supabase
        .from('messages')
        .insert({ type: 'text', ...payload })
        .select()
        .single()
      if (error) throw error
      return data as Message
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: chatKeys.messages(data.conversation_id) })
      qc.invalidateQueries({ queryKey: chatKeys.conversations })
    },
  })
}

export function useMarkConversationRead() {
  return useMutation({
    mutationFn: async ({ conversationId, userId }: { conversationId: string; userId: string }) => {
      const { error } = await supabase
        .from('conversation_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', userId)
      if (error) throw error
    },
  })
}
