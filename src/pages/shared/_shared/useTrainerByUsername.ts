import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'

export interface PublicTrainerProfile {
  user_id: string
  display_name: string | null
  username: string | null
  photo_url: string | null
  bio: string | null
  is_verified: boolean
  trainee_count: number
  member_since: string | null
}

export function useTrainerByUsername(username: string | undefined) {
  return useQuery({
    queryKey: ['public_trainer_profile', username],
    enabled: !!username,
    queryFn: async () => {
      // Join users + trainers on username
      const { data, error } = await supabase
        .from('users')
        .select('id, display_name, username, photo_url, created_at, trainers!inner(bio, is_verified)')
        .eq('username', username!)
        .maybeSingle()

      if (error) throw error
      if (!data) return null

      const trainerRow = Array.isArray(data.trainers)
        ? data.trainers[0]
        : (data.trainers as { bio: string | null; is_verified: boolean } | null)

      // Trainee count
      const { count } = await supabase
        .from('trainees')
        .select('id', { count: 'exact', head: true })
        .eq('trainer_id', data.id)

      return {
        user_id: data.id,
        display_name: data.display_name,
        username: data.username,
        photo_url: data.photo_url,
        bio: trainerRow?.bio ?? null,
        is_verified: trainerRow?.is_verified ?? false,
        trainee_count: count ?? 0,
        member_since: data.created_at,
      } satisfies PublicTrainerProfile
    },
  })
}
